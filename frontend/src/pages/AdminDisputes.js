import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { IoAlertCircle, IoCheckmarkCircle, IoTime, IoEye, IoChatbubbles } from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL;

export default function AdminDisputes() {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [winner, setWinner] = useState('');
  const [resolution, setResolution] = useState('');

  useEffect(() => {
    loadDisputes();
  }, []);

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
        loadDisputes();
      }
    } catch (error) {
      console.error('Error resolving dispute:', error);
      toast.error('Failed to resolve dispute');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'open': return 'text-yellow-400 bg-yellow-900/20';
      case 'under_review': return 'text-orange-400 bg-orange-900/20';
      case 'resolved': return 'text-green-400 bg-green-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">🚨 Admin Dispute Management</h1>
            <p className="text-gray-400">Review and resolve P2P trade disputes</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-800/50 border border-yellow-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <IoAlertCircle className="w-6 h-6 text-yellow-400" />
                <h3 className="text-lg font-semibold text-white">Open Disputes</h3>
              </div>
              <p className="text-3xl font-bold text-yellow-400">
                {disputes.filter(d => d.status === 'open').length}
              </p>
            </div>
            <div className="bg-slate-800/50 border border-orange-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <IoTime className="w-6 h-6 text-orange-400" />
                <h3 className="text-lg font-semibold text-white">Under Review</h3>
              </div>
              <p className="text-3xl font-bold text-orange-400">
                {disputes.filter(d => d.status === 'under_review').length}
              </p>
            </div>
            <div className="bg-slate-800/50 border border-green-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <IoCheckmarkCircle className="w-6 h-6 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Resolved</h3>
              </div>
              <p className="text-3xl font-bold text-green-400">
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
          ) : (
            <div className="space-y-4">
              {disputes.map(dispute => (
                <div
                  key={dispute.dispute_id}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(dispute.status)}`}>
                          {dispute.status?.toUpperCase()}
                        </span>
                        <span className="text-gray-400 text-sm">
                          Trade ID: <span className="text-white font-mono">{dispute.trade_id?.slice(0, 8)}</span>
                        </span>
                        <span className="text-gray-400 text-sm">
                          Dispute ID: <span className="text-white font-mono">{dispute.dispute_id?.slice(0, 8)}</span>
                        </span>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-gray-400 text-sm">Amount</p>
                          <p className="text-white font-semibold">
                            {dispute.amount} {dispute.currency}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Reason</p>
                          <p className="text-white capitalize">
                            {dispute.reason?.replace(/_/g, ' ')}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Initiated By</p>
                          <p className="text-orange-400 font-semibold capitalize">
                            {dispute.initiated_by}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Created</p>
                          <p className="text-white">
                            {new Date(dispute.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
                        <p className="text-gray-400 text-sm mb-1">Description:</p>
                        <p className="text-white">{dispute.description}</p>
                      </div>

                      {/* Parties */}
                      <div className="flex gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Buyer:</span>
                          <span className="text-cyan-400 ml-2 font-mono">
                            {dispute.buyer_id?.slice(0, 8)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Seller:</span>
                          <span className="text-purple-400 ml-2 font-mono">
                            {dispute.seller_id?.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => navigate(`/admin/disputes/${dispute.dispute_id}`)}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <IoEye className="w-4 h-4" />
                        View Details
                      </button>
                      {dispute.status !== 'resolved' && (
                        <button
                          onClick={() => {
                            setSelectedDispute(dispute);
                            setShowResolveModal(true);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <IoCheckmarkCircle className="w-4 h-4" />
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resolve Modal */}
        {showResolveModal && selectedDispute && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border-2 border-green-500 rounded-2xl max-w-2xl w-full shadow-2xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-t-2xl">
                <h2 className="text-2xl font-bold text-white">Resolve Dispute</h2>
                <p className="text-green-100 text-sm mt-1">
                  ID: {selectedDispute.dispute_id?.slice(0, 8)}
                </p>
              </div>

              {/* Form */}
              <div className="p-6 space-y-4">
                {/* Winner Selection */}
                <div>
                  <label className="block text-gray-300 font-semibold mb-2">Select Winner *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setWinner('buyer')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        winner === 'buyer'
                          ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                          : 'border-slate-700 bg-slate-800 text-gray-400 hover:border-slate-600'
                      }`}
                    >
                      <p className="font-semibold">Buyer Wins</p>
                      <p className="text-sm opacity-75">Buyer: {selectedDispute.buyer_id?.slice(0, 8)}</p>
                    </button>
                    <button
                      onClick={() => setWinner('seller')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        winner === 'seller'
                          ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                          : 'border-slate-700 bg-slate-800 text-gray-400 hover:border-slate-600'
                      }`}
                    >
                      <p className="font-semibold">Seller Wins</p>
                      <p className="text-sm opacity-75">Seller: {selectedDispute.seller_id?.slice(0, 8)}</p>
                    </button>
                  </div>
                </div>

                {/* Resolution */}
                <div>
                  <label className="block text-gray-300 font-semibold mb-2">
                    Resolution Details *
                  </label>
                  <textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Explain why this decision was made. This will be visible to both parties."
                    rows={4}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Admin Note */}
                <div>
                  <label className="block text-gray-300 font-semibold mb-2">
                    Internal Admin Note (Optional)
                  </label>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Private notes for admin records only. Not visible to users."
                    rows={3}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Fee Info */}
                <div className="bg-orange-500/10 border-l-4 border-orange-500 p-4">
                  <p className="text-orange-300 text-sm">
                    <strong>Note:</strong> A £5 dispute fee will be charged to the losing party.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowResolveModal(false);
                      setSelectedDispute(null);
                      setWinner('');
                      setResolution('');
                      setAdminNote('');
                    }}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResolve}
                    disabled={!winner || !resolution.trim()}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-all font-semibold"
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
