import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { IoArrowBack, IoCopy, IoCheckmarkCircle, IoWarning, IoTime, IoDocument, IoChatbubbles, IoShield } from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL;

export default function AdminDisputeDetail() {
  const { disputeId } = useParams();
  const navigate = useNavigate();
  const [dispute, setDispute] = useState(null);
  const [trade, setTrade] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminMessage, setAdminMessage] = useState('');
  const [resolution, setResolution] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState('');
  const [showWebViewWarning, setShowWebViewWarning] = useState(false);

  useEffect(() => {
    // Detect if in Gmail/email app webview
    const isWebView = /wv|WebView|Gmail/i.test(navigator.userAgent) || 
                      (window.navigator.standalone === false);
    
    if (isWebView) {
      setShowWebViewWarning(true);
    }
    
    loadDisputeDetails();
    const interval = setInterval(loadDisputeDetails, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [disputeId]);

  const loadDisputeDetails = async () => {
    try {
      const response = await axios.get(`${API}/api/p2p/disputes/${disputeId}`);
      if (response.data.success) {
        setDispute(response.data.dispute);
        setMessages(response.data.dispute.messages || []);
        
        // Trade data is inside dispute object
        if (response.data.dispute && response.data.dispute.trade) {
          setTrade(response.data.dispute.trade);
        }
      }
    } catch (error) {
      console.error('Error loading dispute:', error);
      toast.error('Failed to load dispute details');
    } finally {
      setLoading(false);
    }
  };

  const copyDisputeLink = () => {
    const link = `${window.location.origin}/admin/disputes/${disputeId}`;
    navigator.clipboard.writeText(link);
    toast.success('Dispute link copied to clipboard');
  };

  const sendAdminMessage = async (recipient = 'all') => {
    if (!adminMessage.trim()) return;

    try {
      const response = await axios.post(`${API}/api/p2p/disputes/${disputeId}/message`, {
        sender_id: 'admin',
        sender_type: 'admin',
        message: adminMessage,
        recipient: recipient
      });

      if (response.data.success) {
        setAdminMessage('');
        loadDisputeDetails();
        const recipientText = recipient === 'all' ? 'both parties' : recipient;
        toast.success(`Message sent to ${recipientText}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleResolve = async (winner) => {
    if (!resolution.trim()) {
      toast.error('Please provide resolution details');
      return;
    }

    try {
      // Convert winner to backend format
      const resolutionValue = winner === 'buyer' ? 'release_to_buyer' : 'return_to_seller';
      
      const response = await axios.post(`${API}/api/admin/disputes/${disputeId}/resolve`, {
        resolution: resolutionValue,
        admin_id: 'admin',
        admin_note: `${resolution} | Winner: ${winner}`
      });

      if (response.data.success) {
        toast.success(`Crypto ${winner === 'buyer' ? 'released to buyer' : 'returned to seller'}`);
        setShowResolveModal(false);
        setResolution('');
        setSelectedWinner('');
        loadDisputeDetails();
      } else {
        toast.error(response.data.message || 'Failed to resolve dispute');
      }
    } catch (error) {
      console.error('Error resolving dispute:', error);
      toast.error(error.response?.data?.detail || 'Failed to resolve dispute');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading dispute...</p>
        </div>
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <IoWarning className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-xl">Dispute not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dispute-standalone">
      {/* WebView Warning Modal */}
      {showWebViewWarning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.95)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#1a1a2e',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '400px',
            textAlign: 'center',
            border: '2px solid #FFA500'
          }}>
            <IoWarning style={{ width: '60px', height: '60px', color: '#FFA500', margin: '0 auto 20px' }} />
            <h2 style={{ color: '#FFA500', fontSize: '24px', marginBottom: '15px' }}>⚠️ Please Open in Chrome</h2>
            <p style={{ color: '#fff', marginBottom: '20px', lineHeight: '1.6' }}>
              You're viewing this in an email app browser. For the best experience, please:
            </p>
            <ol style={{ color: '#fff', textAlign: 'left', marginBottom: '20px', paddingLeft: '20px' }}>
              <li style={{ marginBottom: '10px' }}>Tap the <strong>3 dots (⋮)</strong> at the top</li>
              <li style={{ marginBottom: '10px' }}>Select <strong>"Open in Chrome"</strong></li>
            </ol>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success('Link copied! Paste in Chrome');
              }}
              style={{
                background: '#FFA500',
                color: '#000',
                padding: '15px 30px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 'bold',
                fontSize: '16px',
                cursor: 'pointer',
                width: '100%',
                marginBottom: '10px'
              }}
            >
              📋 Copy Link for Chrome
            </button>
            <button
              onClick={() => setShowWebViewWarning(false)}
              style={{
                background: 'transparent',
                color: '#888',
                padding: '10px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Continue anyway (may not work correctly)
            </button>
          </div>
        </div>
      )}
      
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => navigate('/admin/disputes')}
              className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-4 transition-colors"
            >
              <IoArrowBack /> Back to All Disputes
            </button>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  🚨 Dispute Detail
                </h1>
                <p className="text-gray-400 text-sm">ID: {dispute.dispute_id}</p>
              </div>
              <button
                onClick={copyDisputeLink}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <IoCopy className="w-4 h-4" />
                Copy Shareable Link
              </button>
            </div>
          </div>

          {/* Status Banner */}
          <div className={`mb-6 p-4 rounded-xl border-2 ${
            dispute.status === 'resolved' 
              ? 'bg-green-500/10 border-green-500' 
              : 'bg-red-500/10 border-red-500'
          }`}>
            <div className="flex items-center gap-3">
              {dispute.status === 'resolved' ? (
                <IoCheckmarkCircle className="w-8 h-8 text-green-400" />
              ) : (
                <IoWarning className="w-8 h-8 text-red-400" />
              )}
              <div>
                <p className="text-white font-bold text-lg">Status: {dispute.status?.toUpperCase()}</p>
                <p className="text-gray-300 text-sm">Created: {new Date(dispute.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              {/* Trade Info */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4 flex items-center gap-2">
                  <IoDocument className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" />
                  Trade Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div className="bg-slate-900/50 p-3 rounded-lg">
                    <p className="text-gray-400 text-xs mb-1">Order ID</p>
                    <p className="text-white font-mono text-xs break-all">{dispute.trade_id || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-lg">
                    <p className="text-gray-400 text-xs mb-1">Fiat Amount</p>
                    <p className="text-white font-semibold text-sm">{dispute.fiat_amount || dispute.amount || '0'} {dispute.fiat_currency || dispute.currency || 'GBP'}</p>
                  </div>
                  <div className="bg-orange-500/10 border border-orange-500/30 p-3 rounded-lg">
                    <p className="text-gray-400 text-xs mb-1">Crypto in Escrow</p>
                    <p className="text-orange-400 font-semibold text-sm">{dispute.amount || trade?.crypto_amount || '0'} {dispute.currency || trade?.crypto_currency || 'BTC'}</p>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-lg">
                    <p className="text-gray-400 text-xs mb-1">Trade Status</p>
                    <p className="text-white capitalize text-sm">{(trade?.status || dispute.trade_status || 'pending')?.replace(/_/g, ' ')}</p>
                  </div>
                </div>
              </div>

              {/* Dispute Details */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4">Dispute Reason</h2>
                <div className="space-y-3">
                  <div className="bg-slate-900/50 p-3 rounded-lg">
                    <p className="text-gray-400 text-xs mb-1">Reason</p>
                    <p className="text-orange-400 font-semibold capitalize text-sm">{dispute.reason?.replace(/_/g, ' ') || 'Not specified'}</p>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-lg">
                    <p className="text-gray-400 text-xs mb-1">Initiated By</p>
                    <p className="text-white capitalize text-sm">{dispute.initiated_by || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-2">Description</p>
                    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                      <p className="text-white text-sm">{dispute.description || 'No description provided'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parties Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div className="bg-cyan-500/10 border-2 border-cyan-500/30 rounded-xl p-3 md:p-4">
                  <h3 className="text-cyan-400 font-bold mb-2 flex items-center gap-2 text-sm">
                    <IoShield className="w-4 h-4 md:w-5 md:h-5" />
                    Buyer
                  </h3>
                  <p className="text-white font-mono text-xs break-all">{dispute.buyer_id || 'N/A'}</p>
                </div>
                <div className="bg-purple-500/10 border-2 border-purple-500/30 rounded-xl p-3 md:p-4">
                  <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2 text-sm">
                    <IoShield className="w-4 h-4 md:w-5 md:h-5" />
                    Seller
                  </h3>
                  <p className="text-white font-mono text-xs break-all">{dispute.seller_id || 'N/A'}</p>
                </div>
              </div>

              {/* Messages/Evidence */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4 flex items-center gap-2">
                  <IoChatbubbles className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" />
                  Messages & Evidence
                </h2>
                <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                  {messages.length === 0 ? (
                    <p className="text-gray-500 text-center py-8 text-sm">No messages yet</p>
                  ) : (
                    messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg ${
                          msg.sender_type === 'admin'
                            ? 'bg-purple-600/20 border border-purple-500/30 ml-4 md:ml-8'
                            : 'bg-slate-900/50 border border-slate-700 mr-4 md:mr-8'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {msg.sender_type === 'admin' && <IoShield className="w-4 h-4 text-purple-400" />}
                          <span className="text-xs md:text-sm font-semibold text-white capitalize">
                            {msg.sender_type}
                          </span>
                          {msg.recipient && msg.recipient !== 'all' && (
                            <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded">
                              To: {msg.recipient}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {new Date(msg.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-white text-xs md:text-sm break-words">{msg.message}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Admin Message Input */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={adminMessage}
                      onChange={(e) => setAdminMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendAdminMessage('all')}
                      placeholder="Message both parties..."
                      className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 md:px-4 md:py-3 text-white text-sm focus:border-purple-500 focus:outline-none"
                    />
                    <button
                      onClick={() => sendAdminMessage('all')}
                      disabled={!adminMessage.trim()}
                      className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-3 py-2 md:px-6 md:py-3 rounded-lg transition-colors font-semibold text-sm md:text-base whitespace-nowrap flex-shrink-0"
                    >
                      Send to All
                    </button>
                  </div>
                  
                  {/* Individual messaging buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => sendAdminMessage('buyer')}
                      disabled={!adminMessage.trim()}
                      className="flex-1 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg transition-colors text-xs md:text-sm font-semibold"
                    >
                      Send to Buyer Only
                    </button>
                    <button
                      onClick={() => sendAdminMessage('seller')}
                      disabled={!adminMessage.trim()}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg transition-colors text-xs md:text-sm font-semibold"
                    >
                      Send to Seller Only
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Sidebar */}
            <div className="space-y-4">
              {dispute.status !== 'resolved' && (
                <div className="bg-slate-800/50 border-2 border-orange-500/30 rounded-xl p-4 md:p-6">
                  <h3 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4 flex items-center gap-2">
                    <IoWarning className="w-5 h-5 md:w-6 md:h-6 text-orange-400" />
                    Resolve Dispute
                  </h3>
                  
                  <p className="text-gray-400 text-xs md:text-sm mb-3 md:mb-4">
                    Choose the winning party. The losing party will be charged a £5 dispute fee.
                  </p>

                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setSelectedWinner('buyer');
                        setShowResolveModal(true);
                      }}
                      className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-4 py-3 md:px-6 md:py-4 rounded-xl transition-all font-semibold flex items-center justify-center gap-2 text-sm md:text-base"
                    >
                      <IoCheckmarkCircle className="w-4 h-4 md:w-5 md:h-5" />
                      Release Crypto to Buyer
                    </button>
                    
                    <button
                      onClick={() => {
                        setSelectedWinner('seller');
                        setShowResolveModal(true);
                      }}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-3 md:px-6 md:py-4 rounded-xl transition-all font-semibold flex items-center justify-center gap-2 text-sm md:text-base"
                    >
                      <IoCheckmarkCircle className="w-4 h-4 md:w-5 md:h-5" />
                      Return Crypto to Seller
                    </button>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <IoTime className="w-6 h-6 text-cyan-400" />
                  Timeline
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2"></div>
                    <div>
                      <p className="text-white font-semibold text-sm">Dispute Opened</p>
                      <p className="text-gray-400 text-xs">{new Date(dispute.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  {dispute.status === 'resolved' && dispute.resolved_at && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                      <div>
                        <p className="text-white font-semibold text-sm">Dispute Resolved</p>
                        <p className="text-gray-400 text-xs">{new Date(dispute.resolved_at).toLocaleString()}</p>
                        {dispute.winner && (
                          <p className="text-green-400 text-xs mt-1">Winner: {dispute.winner}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resolve Modal */}
        {showResolveModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border-2 border-green-500 rounded-2xl max-w-lg w-full shadow-2xl">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-t-2xl">
                <h2 className="text-2xl font-bold text-white">
                  Confirm Resolution
                </h2>
                <p className="text-green-100 text-sm mt-1">
                  {selectedWinner === 'buyer' ? 'Release crypto to buyer' : 'Return crypto to seller'}
                </p>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="bg-orange-500/10 border-l-4 border-orange-500 p-4">
                  <p className="text-orange-300 text-sm">
                    <strong>Warning:</strong> This action cannot be undone. The losing party will be charged a £5 dispute fee.
                  </p>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-2">Resolution Details *</label>
                  <textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Explain your decision..."
                    rows={4}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowResolveModal(false);
                      setSelectedWinner('');
                      setResolution('');
                    }}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleResolve(selectedWinner)}
                    disabled={!resolution.trim()}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg transition-all font-semibold"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
