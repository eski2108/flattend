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
  Filter,
  Search
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API = process.env.REACT_APP_BACKEND_URL;

// Animated counter component
const AnimatedCounter = ({ value, duration = 1000 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime = null;
    const startValue = displayValue;
    const endValue = value;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const currentValue = startValue + (endValue - startValue) * progress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <span>£{displayValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
};

// Mini sparkline component
const MiniSparkline = ({ data, color }) => {
  const chartData = {
    labels: data.map((_, i) => i),
    datasets: [
      {
        data: data,
        borderColor: color,
        borderWidth: 1.5,
        fill: false,
        pointRadius: 0,
        tension: 0.4
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    },
    scales: {
      x: { display: false },
      y: { display: false }
    }
  };

  return (
    <div style={{ width: '100px', height: '24px' }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default function WalletPagePremium() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPortfolioGBP, setTotalPortfolioGBP] = useState(0);
  const [change24h, setChange24h] = useState(0);
  const [expandedAsset, setExpandedAsset] = useState(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [depositAddress, setDepositAddress] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [filterType, setFilterType] = useState('all');
  
  // OTP state
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  
  // Withdraw form
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNetwork, setWithdrawNetwork] = useState('');

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

  const loadWalletData = async (userId, silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      // Load balances
      const balRes = await axios.get(`${API}/api/wallets/balances/${userId}`);
      if (balRes.data.success) {
        const bals = balRes.data.balances || [];
        setBalances(bals);
        
        // Calculate total portfolio value
        const total = bals.reduce((sum, bal) => sum + (bal.value_gbp || 0), 0);
        setTotalPortfolioGBP(total);
        
        // Mock 24h change (you can fetch real data from price service)
        setChange24h(Math.random() * 10 - 5);
      }
      
      // Load transactions
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
    
    try {
      const res = await axios.post(`${API}/api/wallet/withdraw`, {
        user_id: user.user_id,
        currency: selectedAsset.currency,
        amount: parseFloat(withdrawAmount),
        destination_address: withdrawAddress,
        network: withdrawNetwork
      });
      
      if (res.data.success) {
        toast.success('Withdrawal request submitted');
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
    if (filterType === 'all') return true;
    return tx.type === filterType;
  });

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-xl">Loading wallet...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom, #05060B, #050814)' }}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          
          {/* Portfolio Summary Card */}
          <div 
            className="mb-8 rounded-[20px] p-6"
            style={{
              background: 'linear-gradient(to right, #050C1E, #1C1540)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}
          >
            <div className="text-xs uppercase text-gray-400 mb-2">Total Portfolio Value</div>
            <div className="flex items-end gap-4 mb-6">
              <div className="text-4xl font-bold text-white">
                <AnimatedCounter value={totalPortfolioGBP} />
              </div>
              <div 
                className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  background: change24h >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: change24h >= 0 ? '#22C55E' : '#EF4444'
                }}
              >
                {change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {Math.abs(change24h).toFixed(2)}%
              </div>
            </div>
            
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-1">Available Balance</div>
                <div className="text-lg font-semibold text-white">
                  £{balances.reduce((sum, b) => sum + b.available_balance * (b.price_gbp || 0), 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-1">Locked / Escrow</div>
                <div className="text-lg font-semibold text-white">
                  £{balances.reduce((sum, b) => sum + (b.locked_balance || 0) * (b.price_gbp || 0), 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-1">Pending Withdrawals</div>
                <div className="text-lg font-semibold text-white">£0.00</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-1">Number of Assets</div>
                <div className="text-lg font-semibold text-white">{balances.filter(b => b.total_balance > 0).length}</div>
              </div>
            </div>
          </div>

          {/* Asset List */}
          <div className="bg-[#0B1020] rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-6">Your Assets</h2>
            
            <div className="space-y-2">
              {balances.filter(bal => bal.total_balance > 0).map((asset, index) => (
                <div key={index}>
                  <div 
                    className="flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/5"
                    onClick={() => setExpandedAsset(expandedAsset === index ? null : index)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {asset.currency.substring(0, 2)}
                      </div>
                      <div>
                        <div className="text-white font-medium">{asset.currency}</div>
                        <div className="text-sm text-gray-400">{asset.currency} Network</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8">
                      <div>
                        <div className="text-white font-medium text-right">{asset.available_balance.toFixed(8)} {asset.currency}</div>
                        <div className="text-sm text-gray-400 text-right">£{(asset.available_balance * (asset.price_gbp || 0)).toFixed(2)}</div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className={`text-sm font-medium ${Math.random() > 0.5 ? 'text-green-500' : 'text-red-500'}`}>
                          {Math.random() > 0.5 ? '+' : '-'}{(Math.random() * 10).toFixed(2)}%
                        </div>
                        <MiniSparkline 
                          data={Array.from({ length: 20 }, () => Math.random() * 100)} 
                          color={Math.random() > 0.5 ? '#22C55E' : '#EF4444'}
                        />
                      </div>
                      
                      {expandedAsset === index ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                  </div>
                  
                  {/* Expanded Section */}
                  {expandedAsset === index && (
                    <div className="bg-white/5 rounded-xl p-6 mt-2 space-y-4 animate-in slide-in-from-top-2 duration-200">
                      {/* Balance Breakdown */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="text-xs text-gray-400 mb-1">Available</div>
                          <div className="text-white font-medium">{asset.available_balance.toFixed(8)} {asset.currency}</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="text-xs text-gray-400 mb-1">Locked / Escrow</div>
                          <div className="text-white font-medium">{(asset.locked_balance || 0).toFixed(8)} {asset.currency}</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="text-xs text-gray-400 mb-1">Total</div>
                          <div className="text-white font-medium">{asset.total_balance.toFixed(8)} {asset.currency}</div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <button 
                          onClick={() => handleDepositClick(asset)}
                          className="flex-1 py-3 rounded-full font-medium text-white transition-all duration-200 hover:opacity-90"
                          style={{ background: 'linear-gradient(to right, #2563EB, #38BDF8)' }}
                        >
                          <ArrowDownLeft className="w-4 h-4 inline mr-2" />
                          Deposit
                        </button>
                        <button 
                          onClick={() => handleWithdrawClick(asset)}
                          className="flex-1 py-3 rounded-full font-medium border-2 transition-all duration-200 hover:bg-white/5"
                          style={{ borderColor: '#2563EB', color: '#38BDF8' }}
                        >
                          <ArrowUpRight className="w-4 h-4 inline mr-2" />
                          Withdraw
                        </button>
                        <button 
                          className="flex-1 py-3 rounded-full font-medium border-2 transition-all duration-200 hover:bg-white/5"
                          style={{ borderColor: '#6B7280', color: '#9CA3AF' }}
                        >
                          View History
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-[#0B1020] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Transaction History</h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                >
                  All
                </button>
                <button 
                  onClick={() => setFilterType('deposit')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterType === 'deposit' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                >
                  Deposits
                </button>
                <button 
                  onClick={() => setFilterType('withdrawal')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterType === 'withdrawal' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                >
                  Withdrawals
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-12 text-gray-400">No transactions yet</div>
              ) : (
                filteredTransactions.map((tx, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'deposit' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                        {tx.type === 'deposit' ? <ArrowDownLeft className="w-5 h-5 text-green-500" /> : <ArrowUpRight className="w-5 h-5 text-red-500" />}
                      </div>
                      <div>
                        <div className="text-white font-medium capitalize">{tx.type}</div>
                        <div className="text-sm text-gray-400">{new Date(tx.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">{tx.amount} {tx.currency}</div>
                      <div className={`text-sm px-2 py-1 rounded-full inline-block ${tx.status === 'completed' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                        {tx.status}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && selectedAsset && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold text-white mb-4">Deposit {selectedAsset.currency}</h3>
            
            {depositAddress ? (
              <>
                <div className="bg-white p-4 rounded-xl mb-4">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${depositAddress}`} alt="QR Code" className="w-full" />
                </div>
                
                <div className="bg-white/5 rounded-xl p-4 mb-4">
                  <div className="text-sm text-gray-400 mb-2">Deposit Address</div>
                  <div className="flex items-center gap-2">
                    <code className="text-white text-sm flex-1 break-all">{depositAddress}</code>
                    <button onClick={() => copyToClipboard(depositAddress)} className="text-blue-500 hover:text-blue-400">
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4">
                  <div className="text-yellow-500 text-sm">
                    ⚠️ Send only {selectedAsset.currency} to this address. Sending other coins may result in permanent loss.
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-400">Generating deposit address...</div>
            )}
            
            <button 
              onClick={() => setShowDepositModal(false)}
              className="w-full py-3 rounded-full font-medium text-white transition-all"
              style={{ background: 'linear-gradient(to right, #2563EB, #38BDF8)' }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && selectedAsset && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold text-white mb-4">Withdraw {selectedAsset.currency}</h3>
            
            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <div className="text-sm text-gray-400">Available Balance</div>
              <div className="text-xl text-white font-bold">{selectedAsset.available_balance.toFixed(8)} {selectedAsset.currency}</div>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm text-gray-400 block mb-2">Destination Address</label>
                <input 
                  type="text"
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  className="w-full bg-white/5 border border-gray-700 rounded-lg px-4 py-3 text-white"
                  placeholder="Enter wallet address"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 block mb-2">Amount</label>
                <div className="relative">
                  <input 
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full bg-white/5 border border-gray-700 rounded-lg px-4 py-3 text-white"
                    placeholder="0.00"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                    <button 
                      onClick={() => setWithdrawAmount((selectedAsset.available_balance * 0.5).toFixed(8))}
                      className="text-xs bg-blue-600 px-2 py-1 rounded text-white"
                    >
                      50%
                    </button>
                    <button 
                      onClick={() => setWithdrawAmount(selectedAsset.available_balance.toFixed(8))}
                      className="text-xs bg-blue-600 px-2 py-1 rounded text-white"
                    >
                      MAX
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* OTP Section */}
            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <div className="text-sm text-gray-400 mb-3">SMS Verification Required</div>
              
              {!showOTPInput ? (
                <button 
                  onClick={sendOTP}
                  disabled={sendingOTP}
                  className="w-full py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {sendingOTP ? 'Sending...' : 'Send OTP'}
                </button>
              ) : (
                <div className="space-y-3">
                  <input 
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={6}
                    className="w-full bg-white/5 border border-gray-700 rounded-lg px-4 py-2 text-white text-center text-2xl tracking-widest"
                    placeholder="000000"
                  />
                  {otpVerified ? (
                    <div className="text-green-500 text-sm text-center">✓ OTP Verified</div>
                  ) : (
                    <button 
                      onClick={verifyOTP}
                      className="w-full py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700"
                    >
                      Verify OTP
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 py-3 rounded-full font-medium border-2 border-gray-600 text-gray-400 hover:bg-white/5"
              >
                Cancel
              </button>
              <button 
                onClick={executeWithdrawal}
                disabled={!otpVerified}
                className="flex-1 py-3 rounded-full font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(to right, #2563EB, #38BDF8)' }}
              >
                Confirm Withdrawal
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}