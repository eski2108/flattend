import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Activity, Percent, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import axios from 'axios';

const AdminRevenueDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState(null);
  const [timeframe, setTimeframe] = useState('all'); // all, today, week, month
  const [error, setError] = useState('');

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchRevenueData();
  }, [timeframe]);

  const fetchRevenueData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${BACKEND_URL}/admin/revenue/dashboard?timeframe=${timeframe}`);
      if (response.data.success) {
        setRevenueData(response.data);
      } else {
        setError(response.data.error || 'Failed to load revenue data');
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load revenue data');
      console.error('Error fetching revenue:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency = 'GBP') => {
    if (!amount && amount !== 0) return currency === 'GBP' ? '£0.00' : '0.00000000 ' + currency;
    if (currency === 'GBP') {
      return `£${Number(amount).toFixed(2)}`;
    }
    return `${Number(amount).toFixed(8)} ${currency}`;
  };

  const formatPercentage = (value) => {
    if (!value && value !== 0) return '0.00%';
    return `${value >= 0 ? '+' : ''}${Number(value).toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #1a1f3a 100%)' }}>
        <div className="text-center">
          <RefreshCw className="animate-spin text-cyan-400 mx-auto mb-4" size={48} />
          <p className="text-white text-xl">Loading Revenue Data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #1a1f3a 100%)' }}>
        <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-8 max-w-md">
          <p className="text-red-400 text-center">{error}</p>
          <button
            onClick={fetchRevenueData}
            className="mt-4 w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #1a1f3a 100%)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <TrendingUp className="text-cyan-400" size={40} />
              Admin Revenue Dashboard
            </h1>
            <p className="text-gray-400">Real-time platform fee revenue and analytics</p>
          </div>
          <button
            onClick={fetchRevenueData}
            className="px-6 py-3 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 transition-all flex items-center gap-2 shadow-lg"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        {/* Timeframe Selector */}
        <div className="mb-6 flex gap-3">
          {['all', 'today', 'week', 'month'].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                timeframe === tf
                  ? 'bg-cyan-500 text-white shadow-lg'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {tf.charAt(0).toUpperCase() + tf.slice(1)}
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue */}
          <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/30 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <DollarSign className="text-cyan-400" size={32} />
              <div className="text-cyan-400 text-sm font-bold">TOTAL</div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">
              {formatCurrency(revenueData?.summary?.total_revenue_gbp || 0)}
            </h3>
            <p className="text-gray-400 text-sm">Total Platform Revenue</p>
          </div>

          {/* Net Revenue (After Referrals) */}
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-xl rounded-2xl p-6 border border-green-500/30 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <TrendingUp className="text-green-400" size={32} />
              <div className="text-green-400 text-sm font-bold">NET</div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">
              {formatCurrency(revenueData?.summary?.net_revenue_gbp || 0)}
            </h3>
            <p className="text-gray-400 text-sm">After Referral Commissions</p>
          </div>

          {/* Referral Commissions Paid */}
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <Activity className="text-purple-400" size={32} />
              <div className="text-purple-400 text-sm font-bold">PAID OUT</div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">
              {formatCurrency(revenueData?.summary?.referral_commissions_paid_gbp || 0)}
            </h3>
            <p className="text-gray-400 text-sm">Referral Commissions</p>
          </div>

          {/* Transaction Count */}
          <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-xl rounded-2xl p-6 border border-orange-500/30 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <Percent className="text-orange-400" size={32} />
              <div className="text-orange-400 text-sm font-bold">VOLUME</div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">
              {revenueData?.summary?.total_transactions?.toLocaleString() || 0}
            </h3>
            <p className="text-gray-400 text-sm">Total Fee Transactions</p>
          </div>
        </div>

        {/* Revenue Breakdown by Type */}
        <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 shadow-2xl mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="text-cyan-400" size={28} />
            Revenue Breakdown by Fee Type
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {revenueData?.by_fee_type && revenueData.by_fee_type.length > 0 ? revenueData.by_fee_type.map((fee, idx) => (
              <div
                key={idx}
                className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-cyan-500/50 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-bold">{fee.fee_type}</h3>
                  <span className="text-cyan-400 text-sm font-bold">{fee.percentage.toFixed(1)}%</span>
                </div>
                <p className="text-2xl font-bold text-white mb-1">{formatCurrency(fee.total_revenue)}</p>
                <p className="text-gray-400 text-sm">{fee.transaction_count} transactions</p>
              </div>
            )) : (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-400">No fee type data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Revenue by Currency */}
        <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 shadow-2xl mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <DollarSign className="text-cyan-400" size={28} />
            Revenue by Currency
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {revenueData?.by_currency && revenueData.by_currency.length > 0 ? revenueData.by_currency.map((curr, idx) => (
              <div
                key={idx}
                className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-cyan-500/50 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-bold text-lg">{curr.currency}</h3>
                  <span className="text-cyan-400 text-sm font-bold">{curr.percentage.toFixed(1)}%</span>
                </div>
                <p className="text-2xl font-bold text-white mb-1">
                  {formatCurrency(curr.total_revenue, curr.currency)}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Net: {formatCurrency(curr.net_revenue, curr.currency)}</span>
                  <span className="text-purple-400">Ref: {formatCurrency(curr.referral_paid, curr.currency)}</span>
                </div>
              </div>
            )) : (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-400">No currency data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Revenue Sources */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Fee Types */}
          <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="text-green-400" size={24} />
              Top 5 Revenue Streams
            </h2>
            <div className="space-y-3">
              {revenueData?.by_fee_type && revenueData.by_fee_type.length > 0 ? revenueData.by_fee_type.slice(0, 5).map((fee, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-cyan-400">#{idx + 1}</div>
                    <div>
                      <p className="text-white font-medium">{fee.fee_type}</p>
                      <p className="text-gray-400 text-sm">{fee.transaction_count} txns</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{formatCurrency(fee.total_revenue)}</p>
                    <p className="text-cyan-400 text-sm">{fee.percentage.toFixed(1)}%</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">No revenue stream data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="text-orange-400" size={24} />
              Recent Fee Transactions
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {revenueData?.recent_transactions && revenueData.recent_transactions.length > 0 ? revenueData.recent_transactions.slice(0, 10).map((tx, idx) => (
                <div key={idx} className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-cyan-400 font-medium text-sm">{tx.fee_type}</span>
                    <span className="text-white font-bold">{formatCurrency(tx.admin_fee, tx.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{new Date(tx.timestamp).toLocaleString()}</span>
                    {tx.referrer_commission > 0 && (
                      <span className="text-purple-400">Ref: {formatCurrency(tx.referrer_commission, tx.currency)}</span>
                    )}
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">No recent transactions available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Last updated: {new Date(revenueData?.last_updated || Date.now()).toLocaleString()}</p>
          <p className="mt-2">All revenue data is pulled from live database transactions</p>
        </div>
      </div>
    </div>
  );
};

export default AdminRevenueDashboard;
