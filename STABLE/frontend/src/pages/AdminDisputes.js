import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { IoAlertCircle, IoCheckmarkCircle, IoTime, IoEye, IoWarning, IoCopy } from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL;

export default function AdminDisputes() {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState([]);
  const [filteredDisputes, setFilteredDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [winner, setWinner] = useState('');
  const [resolution, setResolution] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadDisputes();
  }, []);

  useEffect(() => {
    // Apply filter
    if (statusFilter === 'all') {
      setFilteredDisputes(disputes);
    } else {
      setFilteredDisputes(disputes.filter(d => d.status === statusFilter));
    }
  }, [disputes, statusFilter]);

  const loadDisputes = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/disputes/all`);
      if (response.data.success) {
        setDisputes(response.data.disputes);
      }
    } catch (error) {
      console.error('Error loading disputes:', error);
      toast.error('Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!winner || !resolution.trim()) {
      toast.error('Please select a winner and provide resolution details');
      return;
    }

    try {
      const response = await axios.post(`${API}/api/admin/disputes/${selectedDispute.dispute_id}/resolve`, {
        winner: winner,
        resolution: resolution,
        admin_id: 'admin',
        admin_note: adminNote
      });

      if (response.data.success) {
        toast.success('Dispute resolved successfully');
        setShowResolveModal(false);
        setSelectedDispute(null);
        setWinner('');
        setResolution('');
        setAdminNote('');
        loadDisputes();
      }
    } catch (error) {
      console.error('Error resolving dispute:', error);
      toast.error('Failed to resolve dispute');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'open': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'under_review': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'resolved': return 'bg-green-500/20 text-green-400 border-green-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">🚨 Admin Dispute Management</h1>
            <p className="text-gray-400 text-sm md:text-base">Review and resolve P2P trade disputes</p>
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                statusFilter === 'all'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              All ({disputes.length})
            </button>
            <button
              onClick={() => setStatusFilter('open')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                statusFilter === 'open'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              Open ({disputes.filter(d => d.status === 'open').length})
            </button>
            <button
              onClick={() => setStatusFilter('under_review')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                statusFilter === 'under_review'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              Under Review ({disputes.filter(d => d.status === 'under_review').length})
            </button>
            <button
              onClick={() => setStatusFilter('resolved')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                statusFilter === 'resolved'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              Resolved ({disputes.filter(d => d.status === 'resolved').length})
            </button>
            <button
              onClick={() => setStatusFilter('cancelled')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                statusFilter === 'cancelled'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              Cancelled ({disputes.filter(d => d.status === 'cancelled').length})
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-800/50 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <IoAlertCircle className="w-5 h-5 text-yellow-400" />
                <h3 className="text-sm font-semibold text-white">Open Disputes</h3>
              </div>
              <p className="text-2xl font-bold text-yellow-400">
                {disputes.filter(d => d.status === 'open').length}
              </p>
            </div>
            <div className="bg-slate-800/50 border border-orange-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <IoTime className="w-5 h-5 text-orange-400" />
                <h3 className="text-sm font-semibold text-white">Under Review</h3>
              </div>
              <p className="text-2xl font-bold text-orange-400">
                {disputes.filter(d => d.status === 'under_review').length}
              </p>
            </div>
            <div className="bg-slate-800/50 border border-green-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <IoCheckmarkCircle className="w-5 h-5 text-green-400" />
                <h3 className="text-sm font-semibold text-white">Resolved</h3>
              </div>
              <p className="text-2xl font-bold text-green-400">
                {disputes.filter(d => d.status === 'resolved').length}
              </p>
            </div>
          </div>

          {/* Disputes List */}
          {loading ? (
            <div className="text-center text-white py-12">
              <div className="animate-spin w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Loading disputes...</p>
            </div>
          ) : disputes.length === 0 ? (
            <div className="bg-slate-800/50 rounded-xl p-12 text-center">
              <IoCheckmarkCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No disputes to review</p>
            </div>
          ) : filteredDisputes.length === 0 ? (
            <div className="bg-slate-800/50 rounded-xl p-12 text-center">
              <IoAlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No disputes match the selected filter</p>
              <button
                onClick={() => setStatusFilter('all')}
                className="mt-4 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Show All Disputes
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDisputes.map(dispute => (
                <div
                  key={dispute.dispute_id}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-cyan-500/50 transition-colors"
                >
                  {/* Header Row */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(dispute.status)}`}>
                        {dispute.status?.toUpperCase()}
                      </span>
                      <span className="text-gray-400 text-xs">
                        Trade: <span className="text-white font-mono">{dispute.trade_id?.slice(0, 12)}...</span>
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const link = `${window.location.origin}/admin/disputes/${dispute.dispute_id}`;
                          navigator.clipboard.writeText(link);
                          toast.success('Dispute link copied!');
                        }}
                        className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                      >
                        <IoCopy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/admin/disputes/${dispute.dispute_id}`)}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 flex-1 md:flex-none justify-center"
                      >
                        <IoEye className="w-4 h-4" />
                        View
                      </button>
                      {dispute.status !== 'resolved' && (
                        <button
                          onClick={() => {
                            setSelectedDispute(dispute);
                            setShowResolveModal(true);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 flex-1 md:flex-none justify-center"
                        >
                          <IoCheckmarkCircle className="w-4 h-4" />
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Amount</p>
                      <p className="text-white font-semibold text-sm">
                        {dispute.amount} {dispute.currency}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Reason</p>
                      <p className="text-white capitalize text-sm">
                        {dispute.reason?.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Initiated By</p>
                      <p className="text-orange-400 font-semibold capitalize text-sm">
                        {dispute.initiated_by}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Created</p>
                      <p className="text-white text-sm">
                        {new Date(dispute.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">Description:</p>
                    <p className="text-white text-sm">{dispute.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resolve Modal */}
        {showResolveModal && selectedDispute && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border-2 border-green-500 rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 rounded-t-2xl sticky top-0">
                <h2 className="text-xl md:text-2xl font-bold text-white">Resolve Dispute</h2>
                <p className="text-green-100 text-xs mt-1">
                  ID: {selectedDispute.dispute_id?.slice(0, 12)}...
                </p>
              </div>

              {/* Form */}
              <div className="p-4 md:p-6 space-y-4">
                {/* Winner Selection */}
                <div>
                  <label className="block text-gray-300 font-semibold mb-2 text-sm">Select Winner *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setWinner('buyer')}
                      className={`p-3 rounded-lg border-2 transition-all text-sm ${
                        winner === 'buyer'
                          ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                          : 'border-slate-700 bg-slate-800 text-gray-400 hover:border-slate-600'
                      }`}
                    >
                      <p className="font-semibold">Buyer Wins</p>
                      <p className="text-xs opacity-75 truncate">ID: {selectedDispute.buyer_id?.slice(0, 8)}</p>
                    </button>
                    <button
                      onClick={() => setWinner('seller')}
                      className={`p-3 rounded-lg border-2 transition-all text-sm ${
                        winner === 'seller'
                          ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                          : 'border-slate-700 bg-slate-800 text-gray-400 hover:border-slate-600'
                      }`}
                    >
                      <p className="font-semibold">Seller Wins</p>
                      <p className="text-xs opacity-75 truncate">ID: {selectedDispute.seller_id?.slice(0, 8)}</p>
                    </button>
                  </div>
                </div>

                {/* Resolution */}
                <div>
                  <label className="block text-gray-300 font-semibold mb-2 text-sm">
                    Resolution Details *
                  </label>
                  <textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Explain why this decision was made..."
                    rows={4}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-green-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Admin Note */}
                <div>
                  <label className="block text-gray-300 font-semibold mb-2 text-sm">
                    Internal Admin Note (Optional)
                  </label>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Private notes for admin records only..."
                    rows={2}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-green-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Fee Info */}
                <div className="bg-orange-500/10 border-l-4 border-orange-500 p-3">
                  <div className="flex items-start gap-2">
                    <IoWarning className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <p className="text-orange-300 text-xs">
                      <strong>Note:</strong> A £5 dispute fee will be charged to the losing party.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowResolveModal(false);
                      setSelectedDispute(null);
                      setWinner('');
                      setResolution('');
                      setAdminNote('');
                    }}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-lg transition-colors font-semibold text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResolve}
                    disabled={!winner || !resolution.trim()}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-all font-semibold text-sm"
                  >
                    Resolve Dispute
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
