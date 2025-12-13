import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import axios from 'axios';
import { toast } from 'sonner';
import { IoSave, IoMail, IoShield } from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL;

export default function AdminSettings() {
  const [disputeEmail, setDisputeEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/settings`);
      if (response.data.success) {
        setDisputeEmail(response.data.settings.dispute_email || 'info@coinhubx.net');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!disputeEmail || !disputeEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSaving(true);
    try {
      const response = await axios.post(`${API}/api/admin/settings`, {
        dispute_email: disputeEmail
      });

      if (response.data.success) {
        toast.success('Settings saved successfully');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="animate-spin w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading settings...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <IoShield className="w-10 h-10 text-cyan-400" />
              Admin Settings
            </h1>
            <p className="text-gray-400 text-sm md:text-base">Configure platform settings</p>
          </div>

          {/* Dispute Email Setting */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <IoMail className="w-6 h-6 text-orange-400" />
              <h2 className="text-xl font-bold text-white">Dispute Email Address</h2>
            </div>
            
            <p className="text-gray-400 text-sm mb-4">
              This email will receive all P2P dispute alerts. You can change it to any email address where you want to receive dispute notifications.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 font-semibold mb-2 text-sm">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={disputeEmail}
                  onChange={(e) => setDisputeEmail(e.target.value)}
                  placeholder="info@coinhubx.net"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="bg-blue-500/10 border-l-4 border-blue-500 p-4">
                <p className="text-blue-300 text-sm">
                  <strong>💡 Tip:</strong> You can use a team email address or a dedicated support inbox to ensure disputes are handled promptly.
                </p>
              </div>

              <button
                onClick={saveSettings}
                disabled={saving}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg transition-all font-semibold flex items-center gap-2"
              >
                <IoSave className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-orange-500/10 border-2 border-orange-500 rounded-xl p-6">
            <h3 className="text-orange-400 font-bold mb-2 flex items-center gap-2">
              <IoShield className="w-5 h-5" />
              Important Information
            </h3>
            <ul className="text-gray-300 text-sm space-y-2">
              <li>• Changes take effect immediately</li>
              <li>• All future dispute emails will be sent to the new address</li>
              <li>• Make sure the email address is actively monitored</li>
              <li>• Test the system by creating a new dispute after changing the email</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}
