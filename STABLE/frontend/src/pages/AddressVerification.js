import React, { useState } from 'react';
import Layout from '@/components/Layout';
import axios from 'axios';
import { toast } from 'sonner';
import { IoLocation, IoDocument, IoCheckmarkCircle, IoCloudUpload } from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL;

export default function AddressVerification() {
  const [formData, setFormData] = useState({
    full_name: '',
    street_address: '',
    postcode: '',
    country: 'United Kingdom'
  });
  const [document, setDocument] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const user = JSON.parse(localStorage.getItem('cryptobank_user') || '{}');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!document) {
      toast.error('Please upload proof of address document');
      return;
    }

    setUploading(true);
    try {
      // Upload document first (simplified - in production use proper file upload)
      const documentUrl = `/uploads/address_${user.user_id}_${Date.now()}.pdf`;

      // Submit verification
      const response = await axios.post(`${API}/api/merchant/verification/address`, {
        user_id: user.user_id,
        ...formData,
        document_url: documentUrl
      });

      if (response.data.success) {
        toast.success('Address verification submitted for review');
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Error submitting verification:', error);
      toast.error('Failed to submit verification');
    } finally {
      setUploading(false);
    }
  };

  if (submitted) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex items-center justify-center p-4">
          <div className="bg-slate-800/50 border-2 border-green-500 rounded-xl p-8 max-w-md text-center">
            <IoCheckmarkCircle className="w-20 h-20 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-3">Verification Submitted!</h2>
            <p className="text-gray-300 mb-6">
              Your address verification has been submitted for review. You'll be notified once it's approved.
            </p>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-6 py-3 rounded-lg transition-all font-semibold"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 md:p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <IoLocation className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-white mb-2">Address Verification</h1>
              <p className="text-gray-400">
                Verify your address to increase your merchant credibility
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div>
                <label className="block text-gray-300 font-semibold mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="John Smith"
                />
              </div>

              {/* Street Address */}
              <div>
                <label className="block text-gray-300 font-semibold mb-2">
                  Street Address *
                </label>
                <input
                  type="text"
                  value={formData.street_address}
                  onChange={(e) => setFormData({...formData, street_address: e.target.value})}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="123 High Street, London"
                />
              </div>

              {/* Postcode */}
              <div>
                <label className="block text-gray-300 font-semibold mb-2">
                  Postcode *
                </label>
                <input
                  type="text"
                  value={formData.postcode}
                  onChange={(e) => setFormData({...formData, postcode: e.target.value})}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="SW1A 1AA"
                />
              </div>

              {/* Country */}
              <div>
                <label className="block text-gray-300 font-semibold mb-2">
                  Country *
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option>United Kingdom</option>
                  <option>United States</option>
                  <option>Canada</option>
                  <option>Australia</option>
                  <option>Germany</option>
                  <option>France</option>
                  <option>Spain</option>
                  <option>Italy</option>
                </select>
              </div>

              {/* Document Upload */}
              <div>
                <label className="block text-gray-300 font-semibold mb-2">
                  Proof of Address Document *
                </label>
                <p className="text-gray-500 text-sm mb-3">
                  Upload a utility bill, bank statement, or government letter (dated within last 3 months)
                </p>
                <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center hover:border-cyan-500 transition-colors">
                  <input
                    type="file"
                    onChange={(e) => setDocument(e.target.files[0])}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    id="document-upload"
                  />
                  <label htmlFor="document-upload" className="cursor-pointer">
                    <IoCloudUpload className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    {document ? (
                      <p className="text-green-400 font-semibold">{document.name}</p>
                    ) : (
                      <>
                        <p className="text-gray-400 mb-2">Click to upload document</p>
                        <p className="text-gray-600 text-xs">PDF, JPG, PNG (Max 10MB)</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-500/10 border-l-4 border-blue-500 p-4">
                <p className="text-blue-300 text-sm">
                  <strong>🛡️ Note:</strong> Your personal information is encrypted and will only be used for verification purposes. This is not full KYC.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:opacity-50 text-white px-6 py-4 rounded-lg transition-all font-semibold text-lg"
              >
                {uploading ? 'Submitting...' : 'Submit for Verification'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
