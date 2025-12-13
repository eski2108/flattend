import React, { useState } from 'react';
import { IoClose, IoWarning, IoAlertCircle } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

export default function DisputeModal({ isOpen, onClose, tradeId, userId, onDisputeCreated }) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const reasonOptions = [
    { value: 'payment_not_received', label: 'Payment Not Received' },
    { value: 'wrong_amount', label: 'Wrong Amount Received' },
    { value: 'crypto_not_released', label: 'Crypto Not Released' },
    { value: 'scam_attempt', label: 'Suspected Scam' },
    { value: 'other', label: 'Other Issue' }
  ];

  const handleSubmit = async () => {
    if (!reason || !description.trim()) {
      toast.error('Please select a reason and provide details');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/api/p2p/disputes/create`, {
        trade_id: tradeId,
        initiated_by: userId,
        reason: reason,
        description: description
      });

      if (response.data.success) {
        toast.success('Dispute opened. Admin will review shortly.');
        onDisputeCreated(response.data.dispute);
        onClose();
      } else {
        toast.error(response.data.message || 'Failed to open dispute');
      }
    } catch (error) {
      console.error('Error opening dispute:', error);
      toast.error(error.response?.data?.detail || 'Failed to open dispute');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-orange-500 rounded-2xl max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <IoWarning className="w-8 h-8 text-white" />
              <h2 className="text-2xl font-bold text-white">Open Dispute</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <IoClose className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-orange-500/10 border-l-4 border-orange-500 p-4 m-6">
          <div className="flex items-start gap-3">
            <IoAlertCircle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-orange-300 font-semibold mb-1">Dispute Fee: £5</p>
              <p className="text-gray-400 text-sm">
                Opening a dispute will lock this trade. The losing party will be charged a £5 dispute fee.
                Please only open disputes for legitimate issues.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Reason Selection */}
          <div>
            <label className="block text-gray-300 font-semibold mb-2">
              Reason for Dispute *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
            >
              <option value="">Select a reason...</option>
              {reasonOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-gray-300 font-semibold mb-2">
              Detailed Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide as much detail as possible about the issue. Include timestamps, transaction IDs, screenshots, etc."
              rows={5}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none resize-none"
            />
            <p className="text-gray-500 text-sm mt-1">
              {description.length}/500 characters
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !reason || !description.trim()}
              className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-all font-semibold"
            >
              {loading ? 'Opening Dispute...' : 'Open Dispute'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
