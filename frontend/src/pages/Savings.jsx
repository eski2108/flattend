import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { IoLockClosed, IoTrendingUp, IoWallet, IoCash, IoCheckmarkCircle, IoClose, IoArrowForward, IoTime, IoSwapHorizontal } from 'react-icons/io5';
import { BiArrowToTop, BiArrowFromTop } from 'react-icons/bi';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { Sparklines, SparklinesLine } from 'react-sparklines';

const API = process.env.REACT_APP_BACKEND_URL;

// Coin configuration with icons and colors
const COIN_CONFIG = {
  BTC: {
    name: 'Bitcoin',
    icon: '₿',
    color: '#F7931A',
    gradient: 'from-orange-500 to-yellow-600'
  },
  ETH: {
    name: 'Ethereum',
    icon: 'Ξ',
    color: '#627EEA',
    gradient: 'from-indigo-500 to-purple-600'
  },
  USDT: {
    name: 'Tether',
    icon: '₮',
    color: '#26A17B',
    gradient: 'from-green-500 to-emerald-600'
  },
  XRP: {
    name: 'Ripple',
    icon: 'X',
    color: '#00AAE4',
    gradient: 'from-cyan-500 to-blue-600'
  },
  LTC: {
    name: 'Litecoin',
    icon: 'Ł',
    color: '#345D9D',
    gradient: 'from-blue-500 to-indigo-600'
  },
  ADA: {
    name: 'Cardano',
    icon: '₳',
    color: '#0033AD',
    gradient: 'from-blue-600 to-indigo-700'
  },
  DOT: {
    name: 'Polkadot',
    icon: '●',
    color: '#E6007A',
    gradient: 'from-pink-500 to-rose-600'
  },
  DOGE: {
    name: 'Dogecoin',
    icon: 'Ð',
    color: '#C2A633',
    gradient: 'from-yellow-500 to-amber-600'
  }
};

// Premium Card Component
const PremiumCard = ({ children, className = '', glow = false }) => (
  <div 
    className={`rounded-2xl border border-cyan-400/25 bg-[#030A14]/80 backdrop-blur-sm ${className}`}
    style={{
      boxShadow: glow 
        ? '0 0 30px rgba(0, 234, 255, 0.2), inset 0 0 30px rgba(0, 234, 255, 0.05)'
        : '0 0 20px rgba(0, 234, 255, 0.1), inset 0 0 20px rgba(0, 234, 255, 0.03)'
    }}
  >
    {children}
  </div>
);

// Animated Counter
const AnimatedCounter = ({ value, prefix = '£', decimals = 2 }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = display;
    const end = value;
    const duration = 1000;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (end - start) * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span className="text-cyan-400">
      {prefix}{display.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  );
};

// Coin Tile Component
const CoinTile = ({ coin, balance, gbpValue, onDeposit, onWithdraw }) => {
  const config = COIN_CONFIG[coin] || COIN_CONFIG.BTC;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative group">
      <PremiumCard 
        className="p-6 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
        glow={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Top Section */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            {/* Coin Icon */}
            <div 
              className={`w-14 h-14 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center text-2xl font-bold text-white shadow-lg`}
              style={{
                boxShadow: `0 0 20px ${config.color}40`
              }}
            >
              {config.icon}
            </div>
            
            {/* Coin Info */}
            <div>
              <div className="text-xl font-bold text-white">{coin}</div>
              <div className="text-sm text-gray-400">{config.name}</div>
            </div>
          </div>

          {/* Balance */}
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{balance.toFixed(8)}</div>
            <div className="text-lg font-semibold text-cyan-400">£{gbpValue.toFixed(2)}</div>
          </div>
        </div>

        {/* Mini Sparkline */}
        <div className="mb-4" style={{ opacity: 0.6 }}>
          <Sparklines data={Array.from({ length: 20 }, () => Math.random() * 100 + 50)} height={40}>
            <SparklinesLine color={config.color} style={{ strokeWidth: 2, fill: 'none' }} />
          </Sparklines>
        </div>

        {/* Action Buttons */}
        {expanded && (
          <div className="grid grid-cols-2 gap-3 mt-4 animate-fadeIn">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeposit(coin);
              }}
              className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-400 hover:to-blue-400 transition-all duration-300 shadow-lg"
              style={{
                boxShadow: '0 0 20px rgba(0, 234, 255, 0.4)'
              }}
            >
              <BiArrowToTop size={20} />
              <span>Add to Savings</span>
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onWithdraw(coin);
              }}
              className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border-2 border-cyan-400/50 bg-cyan-400/10 text-cyan-400 font-semibold hover:bg-cyan-400/20 transition-all duration-300"
            >
              <BiArrowFromTop size={20} />
              <span>Withdraw</span>
            </button>
          </div>
        )}
      </PremiumCard>
    </div>
  );
};

// Transfer Modal Component
const TransferModal = ({ isOpen, onClose, coin, direction, spotBalance, savingsBalance, onConfirm }) => {
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const config = COIN_CONFIG[coin] || COIN_CONFIG.BTC;

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const maxBalance = direction === 'to_savings' ? spotBalance : savingsBalance;
    if (parseFloat(amount) > maxBalance) {
      toast.error('Insufficient balance');
      return;
    }

    setProcessing(true);
    const success = await onConfirm(coin, parseFloat(amount), direction);
    setProcessing(false);

    if (success) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
        setAmount('');
      }, 2000);
    }
  };

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.8)' }}>
        <PremiumCard className="max-w-md w-full p-8 animate-fadeIn">
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center animate-bounce">
                <IoCheckmarkCircle size={60} className="text-green-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Transfer Successful!</h2>
            <p className="text-gray-400 mb-4">
              {amount} {coin} has been {direction === 'to_savings' ? 'moved to' : 'withdrawn from'} your Savings Vault
            </p>
          </div>
        </PremiumCard>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.8)' }}>
      <PremiumCard className="max-w-md w-full p-8 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div 
              className={`w-12 h-12 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center text-xl font-bold text-white`}
            >
              {config.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {direction === 'to_savings' ? 'Add to Savings' : 'Withdraw from Savings'}
              </h2>
              <p className="text-sm text-gray-400">{config.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <IoClose size={28} />
          </button>
        </div>

        {/* Balance Display */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-white/5 border border-cyan-400/20">
            <div className="text-xs text-gray-400 mb-1">Spot Wallet</div>
            <div className="text-lg font-bold text-white">{spotBalance.toFixed(8)}</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-cyan-400/20">
            <div className="text-xs text-gray-400 mb-1">Savings Vault</div>
            <div className="text-lg font-bold text-cyan-400">{savingsBalance.toFixed(8)}</div>
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-300 mb-2">Amount</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00000000"
              className="w-full px-4 py-3 rounded-xl bg-black/50 border border-cyan-400/30 text-white text-lg focus:outline-none focus:border-cyan-400 transition-all"
              style={{
                boxShadow: '0 0 10px rgba(0, 234, 255, 0.1)'
              }}
            />
            <button
              onClick={() => setAmount((direction === 'to_savings' ? spotBalance : savingsBalance).toString())}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 text-sm font-semibold hover:bg-cyan-500/30 transition-all"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl border-2 border-gray-600 text-gray-300 font-semibold hover:bg-gray-600/20 transition-all"
            disabled={processing}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={processing || !amount || parseFloat(amount) <= 0}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-400 hover:to-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              boxShadow: processing ? 'none' : '0 0 20px rgba(0, 234, 255, 0.4)'
            }}
          >
            {processing ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </PremiumCard>
    </div>
  );
};

// Main Savings Vault Component
export default function SavingsVault() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [savingsData, setSavingsData] = useState([]);
  const [spotBalances, setSpotBalances] = useState({});
  const [totalSavingsGBP, setTotalSavingsGBP] = useState(0);
  const [totalSavingsUSD, setTotalSavingsUSD] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({});
  const [savingsHistory, setSavingsHistory] = useState([]);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const u = JSON.parse(userData);
    setUser(u);
    loadSavingsData(u.user_id);
  }, []);

  const loadSavingsData = async (userId) => {
    try {
      setLoading(true);

      // Load savings balances
      const savingsRes = await axios.get(`${API}/savings/balances/${userId}`);
      if (savingsRes.data.success) {
        setSavingsData(savingsRes.data.balances);
        setTotalSavingsGBP(savingsRes.data.total_value_gbp || 0);
        setTotalSavingsUSD(savingsRes.data.total_value_usd || 0);
      }

      // Load spot wallet balances
      const walletRes = await axios.get(`${API}/wallets/balances/${userId}`);
      if (walletRes.data.balances) {
        const spotMap = {};
        walletRes.data.balances.forEach(b => {
          spotMap[b.currency] = b.available_balance || 0;
        });
        setSpotBalances(spotMap);
      }

      // Load savings history
      const historyRes = await axios.get(`${API}/api/savings/history/${userId}`);
      if (historyRes.data.success) {
        setSavingsHistory(historyRes.data.history || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading savings:', error);
      toast.error('Failed to load savings data');
      setLoading(false);
    }
  };

  const handleTransfer = async (coin, amount, direction) => {
    try {
      const response = await axios.post(`${API}/api/savings/transfer`, {
        user_id: user.user_id,
        currency: coin,
        amount: amount,
        direction: direction
      });

      if (response.data.success) {
        toast.success(response.data.message);
        loadSavingsData(user.user_id);
        return true;
      } else {
        toast.error(response.data.message || 'Transfer failed');
        return false;
      }
    } catch (error) {
      console.error('Transfer error:', error);
      toast.error(error.response?.data?.message || 'Transfer failed');
      return false;
    }
  };

  const openDepositModal = (coin) => {
    const savings = savingsData.find(s => s.currency === coin);
    const spot = spotBalances[coin] || 0;
    setModalConfig({
      coin,
      direction: 'to_savings',
      spotBalance: spot,
      savingsBalance: savings?.savings_balance || 0
    });
    setShowModal(true);
  };

  const openWithdrawModal = (coin) => {
    const savings = savingsData.find(s => s.currency === coin);
    const spot = spotBalances[coin] || 0;
    setModalConfig({
      coin,
      direction: 'to_spot',
      spotBalance: spot,
      savingsBalance: savings?.savings_balance || 0
    });
    setShowModal(true);
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #05121F 0%, #071E2C 50%, #03121E 100%)' }}>
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400 text-lg">Loading Savings Vault...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div 
        className="min-h-screen pb-20 px-4 py-8"
        style={{ background: 'linear-gradient(180deg, #05121F 0%, #071E2C 50%, #03121E 100%)' }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white mb-3" style={{ textShadow: '0 0 30px rgba(0, 234, 255, 0.5)' }}>
              Savings Vault
            </h1>
            <p className="text-gray-400 text-lg">Secure your crypto and earn passive rewards</p>
          </div>

          {/* Total Balance Card */}
          <PremiumCard className="p-8 mb-8" glow>
            <div className="text-center">
              <div className="text-sm text-gray-400 uppercase tracking-wider mb-2 font-semibold">Total Savings Balance</div>
              <div className="text-6xl font-bold mb-2">
                <AnimatedCounter value={totalSavingsGBP} prefix="£" decimals={2} />
              </div>
              <div className="text-xl text-gray-400 mb-6">≈ ${totalSavingsUSD.toFixed(2)} USD</div>
              
              {/* Quick Actions */}
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => {
                    if (savingsData.length > 0) {
                      openDepositModal(savingsData[0].currency);
                    } else {
                      openDepositModal('BTC');
                    }
                  }}
                  className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-lg hover:from-cyan-400 hover:to-blue-400 transition-all shadow-lg flex items-center space-x-2"
                  style={{
                    boxShadow: '0 0 30px rgba(0, 234, 255, 0.4)'
                  }}
                >
                  <BiArrowToTop size={24} />
                  <span>Start Earning</span>
                </button>
              </div>
            </div>
          </PremiumCard>

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <PremiumCard className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <IoTrendingUp size={24} className="text-white" />
                </div>
                <div>
                  <div className="text-sm text-gray-400">Estimated APY</div>
                  <div className="text-2xl font-bold text-white">4.5%</div>
                </div>
              </div>
            </PremiumCard>

            <PremiumCard className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <IoWallet size={24} className="text-white" />
                </div>
                <div>
                  <div className="text-sm text-gray-400">Total Assets</div>
                  <div className="text-2xl font-bold text-white">{savingsData.length}</div>
                </div>
              </div>
            </PremiumCard>

            <PremiumCard className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                  <IoLockClosed size={24} className="text-white" />
                </div>
                <div>
                  <div className="text-sm text-gray-400">Coming Soon</div>
                  <div className="text-lg font-bold text-gray-500">Locked Staking</div>
                </div>
              </div>
            </PremiumCard>
          </div>

          {/* Coin Tiles */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Your Savings Assets</h2>
            {savingsData.length === 0 ? (
              <PremiumCard className="p-12">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mx-auto mb-6">
                    <IoWallet size={48} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">No Savings Yet</h3>
                  <p className="text-gray-400 mb-6 max-w-md mx-auto">
                    Transfer crypto from your Spot Wallet to start earning passive rewards on your holdings.
                  </p>
                  <button
                    onClick={() => openDepositModal('BTC')}
                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold hover:from-cyan-400 hover:to-blue-400 transition-all inline-flex items-center space-x-2"
                  >
                    <BiArrowToTop size={20} />
                    <span>Start Saving Now</span>
                  </button>
                </div>
              </PremiumCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savingsData.map((asset, index) => (
                  <CoinTile
                    key={index}
                    coin={asset.currency}
                    balance={asset.savings_balance}
                    gbpValue={asset.value_gbp || 0}
                    onDeposit={openDepositModal}
                    onWithdraw={openWithdrawModal}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Savings History */}
          {savingsHistory.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Savings History</h2>
              <PremiumCard className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Date</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Type</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Coin</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Amount</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">GBP Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savingsHistory.slice(0, 10).map((tx, index) => (
                        <tr key={index} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-400">
                            {new Date(tx.timestamp).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold ${
                              tx.direction === 'to_savings' 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-orange-500/20 text-orange-400'
                            }`}>
                              {tx.direction === 'to_savings' ? (
                                <><BiArrowToTop size={14} /> <span>Deposit</span></>
                              ) : (
                                <><BiArrowFromTop size={14} /> <span>Withdraw</span></>
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-white">{tx.currency}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-right text-white">
                            {tx.amount.toFixed(8)}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-right text-cyan-400">
                            £{tx.gbp_value?.toFixed(2) || '0.00'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </PremiumCard>
            </div>
          )}

          {/* APY Coming Soon Banner */}
          <PremiumCard className="p-8 text-center">
            <div className="max-w-2xl mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 mb-4">
                <IoTime size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">APY Rewards Coming Soon</h3>
              <p className="text-gray-400">
                We're working on implementing automatic daily APY rewards. For now, enjoy secure storage in your Savings Vault.
              </p>
            </div>
          </PremiumCard>
        </div>
      </div>

      {/* Transfer Modal */}
      {showModal && (
        <TransferModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          coin={modalConfig.coin}
          direction={modalConfig.direction}
          spotBalance={modalConfig.spotBalance}
          savingsBalance={modalConfig.savingsBalance}
          onConfirm={handleTransfer}
        />
      )}
    </Layout>
  );
}
