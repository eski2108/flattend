import React, { useState } from 'react';
import { Search, Star, StarOff, Check, X, AlertCircle } from 'lucide-react';

const AdminReferralControl = () => {
  const [searchType, setSearchType] = useState('email');
  const [searchValue, setSearchValue] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      setError('Please enter a search value');
      return;
    }

    setLoading(true);
    setError('');
    setSearchResult(null);

    try {
      const searchParams = new URLSearchParams();
      if (searchType === 'email') {
        searchParams.append('email', searchValue);
      } else {
        searchParams.append('user_id', searchValue);
      }

      const response = await fetch(
        `${BACKEND_URL}/api/admin/referral/search-users?${searchParams.toString()}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Search failed');
      }

      if (!data.user) {
        setError('User not found');
      } else {
        setSearchResult(data.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGolden = async (activate) => {
    if (!searchResult) return;

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/referral/toggle-golden`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: searchResult.user_id,
          set_golden: activate,
          admin_user_id: currentUser.user_id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Action failed');
      }

      setSuccess(
        activate
          ? `✅ Golden Referrer status ACTIVATED for ${searchResult.email}`
          : `✅ Golden Referrer status DEACTIVATED for ${searchResult.email}`
      );

      // Update search result
      setSearchResult({
        ...searchResult,
        is_golden_referrer: activate,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #1a1f3a 100%)' }}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Star className="text-yellow-400" size={32} />
            Golden Referrer Control Panel
          </h1>
          <p className="text-gray-400">
            Admin-only tool to activate or deactivate Golden Referrer status (50% lifetime commission)
          </p>
        </div>

        {/* Search Section */}
        <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 shadow-2xl mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Search User</h2>

          <div className="space-y-4">
            {/* Search Type */}
            <div className="flex gap-4">
              <button
                onClick={() => setSearchType('email')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  searchType === 'email'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Search by Email
              </button>
              <button
                onClick={() => setSearchType('user_id')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  searchType === 'user_id'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Search by User ID
              </button>
            </div>

            {/* Search Input */}
            <div className="flex gap-3">
              <input
                type="text"
                placeholder={searchType === 'email' ? 'Enter user email...' : 'Enter user ID...'}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Search size={18} />
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-900/30 border border-green-500/50 rounded-lg text-green-400">
                <Check size={18} />
                {success}
              </div>
            )}
          </div>
        </div>

        {/* Search Result */}
        {searchResult && (
          <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">User Details</h2>

            <div className="space-y-4">
              {/* User Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Email</label>
                  <p className="text-white font-medium">{searchResult.email}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">User ID</label>
                  <p className="text-white font-mono text-sm">{searchResult.user_id}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Full Name</label>
                  <p className="text-white font-medium">{searchResult.full_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Current Status</label>
                  <div className="flex items-center gap-2 mt-1">
                    {searchResult.is_golden_referrer ? (
                      <>
                        <Star className="text-yellow-400" size={18} />
                        <span className="text-yellow-400 font-bold">GOLDEN REFERRER (50%)</span>
                      </>
                    ) : (
                      <>
                        <StarOff className="text-gray-400" size={18} />
                        <span className="text-gray-400 font-medium">Standard Referrer (20%)</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-700">
                <h3 className="text-white font-bold mb-3">Actions</h3>
                <div className="flex gap-4">
                  {!searchResult.is_golden_referrer ? (
                    <button
                      onClick={() => handleToggleGolden(true)}
                      disabled={actionLoading}
                      className="flex-1 px-6 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg font-bold hover:from-yellow-600 hover:to-yellow-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                    >
                      <Star size={20} />
                      {actionLoading ? 'Processing...' : 'ACTIVATE Golden Status'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleGolden(false)}
                      disabled={actionLoading}
                      className="flex-1 px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-bold hover:from-red-600 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                    >
                      <X size={20} />
                      {actionLoading ? 'Processing...' : 'DEACTIVATE Golden Status'}
                    </button>
                  )}
                </div>

                {/* Warning */}
                <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-400 text-sm flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Important:</strong> Golden status is permanent until manually deactivated. Golden
                      referrers can share both Standard (20%) and Golden (50%) referral links. Users who sign up
                      via a Golden link will always generate 50% commission for the referrer, regardless of future
                      status changes.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Panel */}
        <div className="mt-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-blue-400 font-bold mb-2 flex items-center gap-2">
            <AlertCircle size={18} />
            System Information
          </h3>
          <ul className="text-blue-300 text-sm space-y-1 list-disc list-inside">
            <li>Standard Tier: 20% lifetime commission (default for all users)</li>
            <li>Golden Tier: 50% lifetime commission (admin-activated only)</li>
            <li>No time limits or automatic expiration for either tier</li>
            <li>Commission tier is locked at signup based on the referral link used</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminReferralControl;
