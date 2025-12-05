import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { IoLockClosed, IoTrendingUp, IoWallet, IoCheckmarkCircle, IoClose, IoTime } from 'react-icons/io5';
import { BiArrowToTop, BiArrowFromTop } from 'react-icons/bi';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { Sparklines, SparklinesLine } from 'react-sparklines';

const API = process.env.REACT_APP_BACKEND_URL;

// Coin metadata for styling - fallback if backend doesn't provide
const COIN_STYLES = {
  'BTC': { icon: '₿', color: '#F7931A', gradient: 'from-orange-500 to-yellow-600' },
  'ETH': { icon: 'Ξ', color: '#627EEA', gradient: 'from-indigo-500 to-purple-600' },
  'USDT': { icon: '₮', color: '#26A17B', gradient: 'from-green-500 to-emerald-600' },
  'XRP': { icon: 'X', color: '#00AAE4', gradient: 'from-cyan-500 to-blue-600' },
  'LTC': { icon: 'Ł', color: '#345D9D', gradient: 'from-blue-500 to-indigo-600' },
  'ADA': { icon: '₳', color: '#0033AD', gradient: 'from-blue-600 to-indigo-700' },
  'DOT': { icon: '●', color: '#E6007A', gradient: 'from-pink-500 to-rose-600' },
  'DOGE': { icon: 'Ð', color: '#C2A633', gradient: 'from-yellow-500 to-amber-600' },
  'BNB': { icon: 'B', color: '#F3BA2F', gradient: 'from-yellow-400 to-orange-500' },
  'SOL': { icon: 'S', color: '#14F195', gradient: 'from-purple-500 to-green-400' },
  'MATIC': { icon: 'M', color: '#8247E5', gradient: 'from-purple-600 to-indigo-600' },
  'AVAX': { icon: 'A', color: '#E84142', gradient: 'from-red-500 to-pink-600' }
};

// Default style for unknown coins
const DEFAULT_STYLE = { icon: '◆', color: '#00E5FF', gradient: 'from-cyan-500 to-blue-500' };

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

// Coin Tile Component - Always shows, even with 0 balance
const CoinTile = ({ coin, savingsBalance, spotBalance, gbpValue, priceHistory, onDeposit, onWithdraw, onNowPaymentsDeposit }) => {
  // Use real price history if available, otherwise use memoized placeholder
  const [placeholderData] = useState(() => 
    Array.from({ length: 20 }, () => Math.random() * 100 + 50)
  );
  
  const sparklineData = priceHistory && priceHistory.length > 0 
    ? priceHistory 
    : placeholderData;

  return (
    <PremiumCard className="p-6 transition-all duration-300 hover:scale-[1.02]">
      {/* Coin Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          {/* Coin Icon */}
          <div 
            className={`w-14 h-14 rounded-full bg-gradient-to-br ${coin.gradient} flex items-center justify-center text-2xl font-bold text-white shadow-lg`}
            style={{
              boxShadow: `0 0 20px ${coin.color}40`
            }}
          >
            {coin.icon}
          </div>
          
          {/* Coin Info */}
          <div>
            <div className="text-xl font-bold text-white">{coin.code}</div>
            <div className="text-sm text-gray-400">{coin.name}</div>
          </div>
        </div>

        {/* Savings Balance */}
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{savingsBalance.toFixed(8)}</div>
          <div className="text-lg font-semibold text-cyan-400">£{gbpValue.toFixed(2)}</div>
        </div>
      </div>

      {/* Mini Sparkline - Real Data */}
      <div className="mb-4" style={{ opacity: 0.6, height: '40px' }}>
        <Sparklines data={sparklineData} height={40}>
          <SparklinesLine color={coin.color} style={{ strokeWidth: 2, fill: 'none' }} />
        </Sparklines>
      </div>

      {/* Spot Wallet Balance Info */}
      <div className="mb-4 p-3 rounded-lg bg-white/5 border border-cyan-400/20">
        <div className="text-xs text-gray-400 mb-1">Available in Spot Wallet</div>
        <div className="text-sm font-bold text-white">{spotBalance.toFixed(8)} {coin.code}</div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => spotBalance > 0 ? onDeposit(coin.code) : onNowPaymentsDeposit(coin.code)}
          className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-400 hover:to-blue-400 transition-all duration-300 shadow-lg"
          style={{
            boxShadow: '0 0 20px rgba(0, 234, 255, 0.4)'
          }}
        >
          <BiArrowToTop size={20} />
          <span>{spotBalance > 0 ? 'Add' : 'Deposit'}</span>
        </button>
        
        <button
          onClick={() => onWithdraw(coin.code)}
          disabled={savingsBalance === 0}
          className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border-2 border-cyan-400/50 bg-cyan-400/10 text-cyan-400 font-semibold hover:bg-cyan-400/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <BiArrowFromTop size={20} />
          <span>Withdraw</span>
        </button>
      </div>
    </PremiumCard>
  );
};

// Transfer Modal Component
const TransferModal = ({ isOpen, onClose, coin, direction, spotBalance, savingsBalance, onConfirm }) => {
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const coinData = SUPPORTED_COINS.find(c => c.code === coin) || SUPPORTED_COINS[0];

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
              className={`w-12 h-12 rounded-full bg-gradient-to-br ${coinData.gradient} flex items-center justify-center text-xl font-bold text-white`}
            >
              {coinData.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {direction === 'to_savings' ? 'Add to Savings' : 'Withdraw from Savings'}
              </h2>
              <p className="text-sm text-gray-400">{coinData.name}</p>
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
              step="0.00000001"
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
  const [savingsBalances, setSavingsBalances] = useState({});
  const [spotBalances, setSpotBalances] = useState({});
  const [totalSavingsGBP, setTotalSavingsGBP] = useState(0);
  const [totalSavingsUSD, setTotalSavingsUSD] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({});
  const [savingsHistory, setSavingsHistory] = useState([]);
  const [prices, setPrices] = useState({});
  const [priceHistories, setPriceHistories] = useState({});
  const [supportedCoins, setSupportedCoins] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const coinsPerPage = 12;

  const loadData = React.useCallback(async (userId) => {
    try {
      setLoading(true);

      // Load savings balances
      const savingsRes = await axios.get(`${API}/savings/balances/${userId}`);
      if (savingsRes.data.success) {
        const savingsMap = {};
        let totalGBP = 0;
        let totalUSD = 0;
        savingsRes.data.balances.forEach(b => {
          savingsMap[b.currency] = b.savings_balance || 0;
          totalGBP += b.value_gbp || 0;
          totalUSD += b.value_usd || 0;
        });
        setSavingsBalances(savingsMap);
        setTotalSavingsGBP(totalGBP);
        setTotalSavingsUSD(totalUSD);
      }

      // Load spot wallet balances
      const walletRes = await axios.get(`${API}/wallets/balances/${userId}`);
      if (walletRes.data.balances) {
        const spotMap = {};
        const priceMap = {};
        const coinsList = [];
        
        walletRes.data.balances.forEach(b => {
          spotMap[b.currency] = b.available_balance || 0;
          priceMap[b.currency] = b.price_gbp || 0;
          
          // Build supported coins list from wallet data
          const style = COIN_STYLES[b.currency] || DEFAULT_STYLE;
          coinsList.push({
            code: b.currency,
            name: b.currency_name || b.currency,
            ...style
          });
        });
        
        setSpotBalances(spotMap);
        setPrices(priceMap);
        setSupportedCoins(coinsList);
      }

      // Load savings history
      const historyRes = await axios.get(`${API}/savings/history/${userId}`);
      if (historyRes.data.success) {
        setSavingsHistory(historyRes.data.history || []);
      }

      // Load 24h price history for all coins
      const historyMap = {};
      for (const coin of SUPPORTED_COINS) {
        try {
          const priceHistRes = await axios.get(`${API}/savings/price-history/${coin.code}`);
          if (priceHistRes.data.success) {
            historyMap[coin.code] = priceHistRes.data.prices;
          }
        } catch (err) {
          console.error(`Failed to load price history for ${coin.code}:`, err);
        }
      }
      setPriceHistories(historyMap);

      setLoading(false);
    } catch (error) {
      console.error('Error loading savings:', error);
      toast.error('Failed to load savings data');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const u = JSON.parse(userData);
    setUser(u);
    loadData(u.user_id);
  }, [navigate, loadData]);

  const handleTransfer = async (coin, amount, direction) => {
    try {
      const response = await axios.post(`${API}/savings/transfer`, {
        user_id: user.user_id,
        currency: coin,
        amount: amount,
        direction: direction
      });

      if (response.data.success) {
        toast.success(response.data.message);
        loadData(user.user_id);
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

  const openDepositModal = (coinCode) => {
    const spot = spotBalances[coinCode] || 0;
    const savings = savingsBalances[coinCode] || 0;
    setModalConfig({
      coin: coinCode,
      direction: 'to_savings',
      spotBalance: spot,
      savingsBalance: savings
    });
    setShowModal(true);
  };

  const openWithdrawModal = (coinCode) => {
    const spot = spotBalances[coinCode] || 0;
    const savings = savingsBalances[coinCode] || 0;
    setModalConfig({
      coin: coinCode,
      direction: 'to_spot',
      spotBalance: spot,
      savingsBalance: savings
    });
    setShowModal(true);
  };

  const handleNowPaymentsDeposit = async (coinCode) => {
    try {
      // Show input modal to get amount
      const amount = prompt(`How much ${coinCode} would you like to deposit?`);
      if (!amount || parseFloat(amount) <= 0) {
        return;
      }

      toast.info('Creating payment...');
      
      const response = await axios.post(`${API}/savings/create-deposit`, {
        user_id: user.user_id,
        currency: coinCode,
        amount: parseFloat(amount)
      });

      if (response.data.success) {
        const { pay_address, payment_url, pay_amount } = response.data;
        
        // Show payment details
        const message = `
Payment Created!

Send ${pay_amount} ${coinCode} to:
${pay_address}

Or use this link: ${payment_url}

After payment is confirmed, funds will be credited to your Spot Wallet automatically.
        `;
        
        alert(message);
        toast.success('Payment created! Check your email for details.');
        
        // Optionally open payment URL
        if (payment_url && confirm('Open payment page?')) {
          window.open(payment_url, '_blank');
        }
      } else {
        toast.error('Failed to create payment');
      }
    } catch (error) {
      console.error('NOWPayments deposit error:', error);
      toast.error(error.response?.data?.detail || 'Failed to create deposit');
    }
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
                  <div className="text-2xl font-bold text-white">{SUPPORTED_COINS.length}</div>
                </div>
              </div>
            </PremiumCard>

            <PremiumCard className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-yellow-600 flex items-center justify-center">
                  <IoTime size={24} className="text-white" />
                </div>
                <div>
                  <div className="text-sm text-gray-400">Coming Soon</div>
                  <div className="text-lg font-bold text-gray-500">APY Rewards</div>
                </div>
              </div>
            </PremiumCard>
          </div>

          {/* All Coin Tiles - Always Visible */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">All Savings Assets</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {SUPPORTED_COINS.map((coin) => (
                <CoinTile
                  key={coin.code}
                  coin={coin}
                  savingsBalance={savingsBalances[coin.code] || 0}
                  spotBalance={spotBalances[coin.code] || 0}
                  gbpValue={(savingsBalances[coin.code] || 0) * (prices[coin.code] || 0)}
                  priceHistory={priceHistories[coin.code] || []}
                  onDeposit={openDepositModal}
                  onWithdraw={openWithdrawModal}
                  onNowPaymentsDeposit={handleNowPaymentsDeposit}
                />
              ))}
            </div>
          </div>

          {/* Savings History */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Savings History</h2>
            <PremiumCard className="overflow-hidden">
              {savingsHistory.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-400">No transactions yet. Start saving to see your history here.</p>
                </div>
              ) : (
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
                      {savingsHistory.slice(0, 20).map((tx, index) => (
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
                            {tx.amount?.toFixed(8) || '0.00000000'}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-right text-cyan-400">
                            £{tx.gbp_value?.toFixed(2) || '0.00'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </PremiumCard>
          </div>

          {/* APY Coming Soon Banner */}
          <PremiumCard className="p-8 text-center">
            <div className="max-w-2xl mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 mb-4">
                <IoLockClosed size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">APY Rewards Coming Soon</h3>
              <p className="text-gray-400">
                We&apos;re working on implementing automatic daily APY rewards. For now, enjoy secure storage in your Savings Vault.
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
