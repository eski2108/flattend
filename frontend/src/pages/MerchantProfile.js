import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  IoCheckmarkCircle, IoShield, IoTime, IoPeople, IoTrophy, 
  IoStarOutline, IoStar, IoMail, IoPhonePortrait, IoLocation
} from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL;

export default function MerchantProfile() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      const response = await axios.get(`${API}/api/merchant/profile/${userId}`);
      if (response.data.success) {
        setProfile(response.data.profile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load merchant profile');
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank) => {
    const badges = {
      platinum: { color: 'from-cyan-400 to-blue-500', icon: '💎', label: 'Platinum Merchant' },
      gold: { color: 'from-yellow-400 to-orange-500', icon: '🥇', label: 'Gold Merchant' },
      silver: { color: 'from-gray-300 to-gray-500', icon: '🥈', label: 'Silver Merchant' },
      bronze: { color: 'from-orange-300 to-orange-600', icon: '🥉', label: 'Bronze Merchant' },
      none: { color: 'from-slate-500 to-slate-700', icon: '⭐', label: 'Trader' }
    };
    return badges[rank] || badges.none;
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="animate-spin w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading profile...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex items-center justify-center">
          <div className="text-center text-white">
            <p className="text-xl">Merchant profile not found</p>
          </div>
        </div>
      </Layout>
    );
  }

  const rankBadge = getRankBadge(profile.rank);
  const stats = profile.stats || {};

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Profile Header */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                  {profile.username?.[0]?.toUpperCase() || 'M'}
                </div>
                {/* Rank Badge */}
                <div className={`absolute -bottom-2 -right-2 bg-gradient-to-r ${rankBadge.color} rounded-full p-2 text-2xl`}>
                  {rankBadge.icon}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  {profile.username || 'Anonymous Trader'}
                </h1>
                <div className={`inline-block bg-gradient-to-r ${rankBadge.color} px-4 py-1 rounded-full text-white font-semibold text-sm mb-3`}>
                  {rankBadge.label}
                </div>

                {/* Verification Badges */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {profile.verifications?.email && (
                    <div className="flex items-center gap-1 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs">
                      <IoMail className="w-4 h-4" />
                      <span>Email Verified</span>
                    </div>
                  )}
                  {profile.verifications?.sms && (
                    <div className="flex items-center gap-1 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs">
                      <IoPhonePortrait className="w-4 h-4" />
                      <span>SMS Verified</span>
                    </div>
                  )}
                  {profile.verifications?.address && (
                    <div className="flex items-center gap-1 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs">
                      <IoLocation className="w-4 h-4" />
                      <span>Address Verified</span>
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-300">
                  <div>
                    <span className="text-gray-400">Member for:</span>
                    <span className="text-white ml-2 font-semibold">{profile.account_age_days} days</span>
                  </div>
                  {stats.first_trade_date && (
                    <div>
                      <span className="text-gray-400">Trading since:</span>
                      <span className="text-white ml-2 font-semibold">
                        {new Date(stats.first_trade_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Deposit Badge */}
              {profile.deposit && (
                <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 rounded-xl p-4 text-center">
                  <IoShield className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-400 mb-1">Security Deposit</p>
                  <p className="text-xl font-bold text-yellow-400">
                    ${profile.deposit.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">{profile.deposit.currency}</p>
                </div>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* All-Time Stats */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <IoTrophy className="w-5 h-5 text-cyan-400" />
                All-Time Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Total Trades</span>
                  <span className="text-white font-semibold">{stats.all_time_trades || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Buy Orders</span>
                  <span className="text-green-400 font-semibold">{stats.all_time_buy_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Sell Orders</span>
                  <span className="text-orange-400 font-semibold">{stats.all_time_sell_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Success Rate</span>
                  <span className="text-cyan-400 font-semibold">
                    {stats.all_time_trades > 0 
                      ? Math.round((stats.successful_trades / stats.all_time_trades) * 100)
                      : 100}%
                  </span>
                </div>
              </div>
            </div>

            {/* 30-Day Performance */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <IoTime className="w-5 h-5 text-green-400" />
                30-Day Performance
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Trades (30d)</span>
                  <span className="text-white font-semibold">{stats.thirty_day_trades || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Completion Rate</span>
                  <span className="text-green-400 font-semibold text-lg">
                    {stats.thirty_day_completion_rate?.toFixed(1) || '100.0'}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Avg Pay Time</span>
                  <span className="text-cyan-400 font-semibold">
                    {formatTime(stats.average_pay_time_seconds)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Avg Release Time</span>
                  <span className="text-purple-400 font-semibold">
                    {formatTime(stats.average_release_time_seconds)}
                  </span>
                </div>
              </div>
            </div>

            {/* Trading Partners */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <IoPeople className="w-5 h-5 text-purple-400" />
                Network
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Trading Partners</span>
                  <span className="text-white font-semibold">{stats.total_counterparties || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Successful</span>
                  <span className="text-green-400 font-semibold">{stats.successful_trades || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Cancelled</span>
                  <span className="text-red-400 font-semibold">{stats.cancelled_trades || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Disputed</span>
                  <span className="text-orange-400 font-semibold">{stats.disputed_trades || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Ads */}
          {profile.active_ads && profile.active_ads.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Active Offers ({profile.active_ads.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profile.active_ads.map((ad, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 hover:border-cyan-500/50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-white font-semibold text-lg">
                          {ad.crypto_amount} {ad.crypto}
                        </p>
                        <p className="text-gray-400 text-xs">@ £{ad.price_fixed}/unit</p>
                      </div>
                      <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-semibold">
                        Active
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Available:</span>
                        <span className="text-white">{ad.amount_available} {ad.crypto}</span>
                      </div>
                      {ad.payment_methods && (
                        <div className="flex flex-wrap gap-1">
                          {ad.payment_methods.map((method, i) => (
                            <span key={i} className="bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded text-xs">
                              {method}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
