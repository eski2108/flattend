import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import QuoteCountdown from '@/components/QuoteCountdown';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  IoCash, 
  IoWallet, 
  IoCheckmarkCircle, 
  IoAlertCircle,
  IoTrendingUp,
  IoRefresh
} from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL;

const SUPPORTED_CRYPTOS = [
  { symbol: 'BTC', name: 'Bitcoin', icon: '₿' },
  { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ' },
  { symbol: 'USDT', name: 'Tether', icon: '₮' }
];

export default function InstantBuyNew() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('input'); // 'input', 'quote', 'executing', 'success'
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gbpBalance, setGbpBalance] = useState(0);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const u = JSON.parse(userData);
    setUser(u);
    loadGbpBalance(u.user_id);
  }, [navigate]);

  const loadGbpBalance = async (userId) => {
    try {
      const response = await axios.get(`${API}/api/wallets/balances/${userId}`);
      if (response.data.success) {
        const gbp = response.data.balances?.find(b => b.currency === 'GBP');
        setGbpBalance(gbp?.available_balance || 0);
      }
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  const generateQuote = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/api/admin-liquidity/quote`, {
        user_id: user.user_id,
        type: 'buy',
        crypto: selectedCrypto,
        amount: parseFloat(amount)
      });

      if (response.data.success) {
        setQuote(response.data.quote);
        setStep('quote');
        toast.success('Quote generated successfully!');
      } else {
        toast.error(response.data.detail || 'Failed to generate quote');
      }
    } catch (error) {
      console.error('Quote error:', error);
      toast.error(error.response?.data?.detail || 'Failed to generate quote');
    } finally {
      setLoading(false);
    }
  };

  const executeQuote = async () => {
    if (!quote) return;

    // Check balance
    if (gbpBalance < quote.total_cost) {
      toast.error(`Insufficient GBP balance. Need £${quote.total_cost.toFixed(2)}`);
      return;
    }

    setStep('executing');
    try {
      const response = await axios.post(`${API}/api/admin-liquidity/execute`, {
        quote_id: quote.quote_id,
        user_id: user.user_id
      });

      if (response.data.success) {
        setStep('success');
        toast.success('Purchase completed successfully!');
        setTimeout(() => {
          navigate('/wallet');
        }, 2000);
      } else {
        toast.error(response.data.detail || 'Execution failed');
        setStep('quote');
      }
    } catch (error) {
      console.error('Execution error:', error);
      const errorMsg = error.response?.data?.detail || 'Execution failed';
      toast.error(errorMsg);
      
      if (errorMsg.includes('expired')) {
        setStep('input');
        setQuote(null);
      } else {
        setStep('quote');
      }
    }
  };

  const handleQuoteExpire = () => {
    toast.error('Quote expired. Please generate a new quote.');
    setStep('input');
    setQuote(null);
  };

  const resetFlow = () => {
    setStep('input');
    setQuote(null);
    setAmount('');
  };

  const selectedCoin = SUPPORTED_CRYPTOS.find(c => c.symbol === selectedCrypto);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              Instant Buy Crypto
            </h1>
            <p className="text-gray-400">
              Get crypto instantly at locked prices
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700 p-8">
            
            {/* Step 1: Input */}
            {step === 'input' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Cryptocurrency
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {SUPPORTED_CRYPTOS.map(crypto => (
                      <button
                        key={crypto.symbol}
                        onClick={() => setSelectedCrypto(crypto.symbol)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          selectedCrypto === crypto.symbol
                            ? 'border-purple-500 bg-purple-500/20'
                            : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                        }`}
                      >
                        <div className="text-3xl mb-1">{crypto.icon}</div>
                        <div className="text-sm font-medium text-white">{crypto.symbol}</div>
                        <div className="text-xs text-gray-400">{crypto.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Amount of {selectedCoin?.name}
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.01"
                    step="0.001"
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex items-center gap-2 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <IoWallet className="text-blue-400 text-xl" />
                  <div>
                    <div className="text-xs text-blue-300">Available Balance</div>
                    <div className="text-lg font-bold text-blue-200">£{gbpBalance.toFixed(2)}</div>
                  </div>
                </div>

                <button
                  onClick={generateQuote}
                  disabled={loading || !amount}
                  className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl transition-all disabled:cursor-not-allowed"
                >
                  {loading ? 'Generating Quote...' : 'Get Instant Quote'}
                </button>
              </div>
            )}

            {/* Step 2: Quote Display */}
            {step === 'quote' && quote && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white">Your Locked Quote</h2>
                  <QuoteCountdown 
                    expiresAt={quote.expires_at} 
                    onExpire={handleQuoteExpire}
                  />
                </div>

                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-6">
                  <div className="text-center mb-4">
                    <div className="text-gray-400 text-sm mb-1">You're buying</div>
                    <div className="text-4xl font-bold text-white mb-2">
                      {quote.crypto_amount} {quote.crypto_currency}
                    </div>
                    <div className="text-gray-400 text-sm">at locked price</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Market Price</div>
                      <div className="text-lg font-bold text-gray-300">
                        £{quote.market_price_at_quote.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-purple-500/20 rounded-lg p-3">
                      <div className="text-xs text-purple-300 mb-1">Your Locked Price</div>
                      <div className="text-lg font-bold text-purple-200">
                        £{quote.locked_price.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Base Cost</span>
                      <span className="text-white">£{quote.base_cost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Platform Fee ({quote.fee_percent}%)</span>
                      <span className="text-white">£{quote.fee_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Spread</span>
                      <span className="text-green-400">+{quote.spread_percent}%</span>
                    </div>
                    <div className="border-t border-gray-700 mt-2 pt-2">
                      <div className="flex justify-between font-bold">
                        <span className="text-white">Total Cost</span>
                        <span className="text-xl text-purple-400">£{quote.total_cost.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                  <IoAlertCircle className="text-yellow-400 text-xl mt-0.5" />
                  <div className="text-sm text-yellow-200">
                    <strong>Price Locked!</strong> This price is guaranteed for 5 minutes. 
                    The market price may change, but you'll pay exactly £{quote.total_cost.toFixed(2)}.
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={resetFlow}
                    className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeQuote}
                    disabled={gbpBalance < quote.total_cost}
                    className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl transition-all disabled:cursor-not-allowed"
                  >
                    {gbpBalance < quote.total_cost ? 'Insufficient Balance' : 'Confirm Purchase'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Executing */}
            {step === 'executing' && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mb-4"></div>
                <h3 className="text-xl font-bold text-white mb-2">Processing Your Purchase...</h3>
                <p className="text-gray-400">Please wait while we complete your transaction</p>
              </div>
            )}

            {/* Step 4: Success */}
            {step === 'success' && quote && (
              <div className="text-center py-12">
                <IoCheckmarkCircle className="text-green-500 text-6xl mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Purchase Successful!</h3>
                <p className="text-gray-400 mb-4">Your crypto has been added to your wallet</p>
                <div className="bg-gray-700/50 rounded-xl p-4 inline-block">
                  <div className="text-3xl font-bold text-purple-400 mb-1">
                    +{quote.crypto_amount} {quote.crypto_currency}
                  </div>
                  <div className="text-sm text-gray-400">
                    for £{quote.total_cost.toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
