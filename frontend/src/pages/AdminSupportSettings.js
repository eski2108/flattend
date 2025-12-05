import React, { useState, useEffect } from 'react';
import { Mail, Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import axios from 'axios';

const AdminSupportSettings = () => {
  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BACKEND_URL}/api/admin/support/emails`);
      if (response.data.success) {
        setEmails(response.data.emails || []);
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error);
      setMessage({ type: 'error', text: 'Failed to load email configuration' });
    } finally {
      setLoading(false);
    }
  };

  const addEmail = () => {
    if (!newEmail.trim()) return;
    
    // Basic email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(newEmail)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    if (emails.includes(newEmail)) {
      setMessage({ type: 'error', text: 'This email is already added' });
      return;
    }

    setEmails([...emails, newEmail]);
    setNewEmail('');
    setMessage({ type: '', text: '' });
  };

  const removeEmail = (emailToRemove) => {
    setEmails(emails.filter(email => email !== emailToRemove));
  };

  const saveConfiguration = async () => {
    try {
      setSaving(true);
      const response = await axios.post(`${BACKEND_URL}/api/admin/support/emails`, {
        emails: emails
      });
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Support emails updated successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      console.error('Failed to save emails:', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen p-8" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #1a1f3a 100%)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Mail className="text-cyan-400" size={32} />
            Support Email Configuration
          </h1>
          <p className="text-gray-400">
            Configure which email addresses receive support notifications when customers contact support
          </p>
        </div>

        {/* Message */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-green-900/30 border border-green-500/50 text-green-400'
                : 'bg-red-900/30 border border-red-500/50 text-red-400'
            }`}
          >
            <AlertCircle size={18} />
            {message.text}
          </div>
        )}

        {/* Add Email Section */}
        <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 shadow-2xl mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Add Support Email</h2>
          <div className="flex gap-3">
            <input
              type="email"
              placeholder="support@coinhubx.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addEmail()}
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <button
              onClick={addEmail}
              className="px-6 py-3 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 transition-colors flex items-center gap-2"
            >
              <Plus size={18} />
              Add
            </button>
          </div>
          <p className="text-gray-500 text-sm mt-2">
            Add multiple email addresses to receive support notifications
          </p>
        </div>

        {/* Current Emails */}
        <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 shadow-2xl mb-6">
          <h2 className="text-xl font-bold text-white mb-4">
            Configured Emails ({emails.length})
          </h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
              <p className="text-gray-400 mt-4">Loading...</p>
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400">No support emails configured yet</p>
              <p className="text-gray-500 text-sm mt-2">
                Add at least one email address to receive support notifications
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {emails.map((email, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-cyan-500/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="text-cyan-400" size={20} />
                    <span className="text-white font-medium">{email}</span>
                  </div>
                  <button
                    onClick={() => removeEmail(email)}
                    className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <button
            onClick={saveConfiguration}
            disabled={saving || emails.length === 0}
            className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-bold hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
          >
            <Save size={20} />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>

        {/* Info Panel */}
        <div className="mt-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-blue-400 font-bold mb-2 flex items-center gap-2">
            <AlertCircle size={18} />
            How It Works
          </h3>
          <ul className="text-blue-300 text-sm space-y-1 list-disc list-inside">
            <li>When a customer sends a support message, all configured emails will receive a notification</li>
            <li>The email includes the customer's message and a link to the admin panel</li>
            <li>You can add multiple email addresses (e.g., support@, admin@, yourname@)</li>
            <li>Emails are sent instantly via SendGrid</li>
            <li>Make sure your SendGrid API key is configured in environment variables</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminSupportSettings;
