import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { IoAlertCircle, IoChatbubbles, IoCheckmark as Check, IoCheckmarkCircle, IoCloudUpload, IoShield, IoTime } from 'react-icons/io5';
import OTPModal from '@/components/OTPModal';
import P2PNotifications from '@/components/P2PNotifications';
import DisputeModal from '@/components/DisputeModal';
import DisputeChatModal from '@/components/DisputeChatModal';
const API = process.env.REACT_APP_BACKEND_URL;

export default function P2PTradeDetailDemo() {
  const { tradeId } = useParams();
  const navigate = useNavigate();
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [user, setUser] = useState(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showDisputeChatModal, setShowDisputeChatModal] = useState(false);
  const [dispute, setDispute] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('cryptobank_user') || '{}');
    setUser(userData);
    loadTradeDetails();
  }, [tradeId]);

  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeRemaining]);

  const loadTradeDetails = async () => {
    try {
      const response = await axios.get(`${API}/api/p2p/trade/${tradeId}`);
      if (response.data.success) {
        setTrade(response.data.trade);
        setTimeRemaining(response.data.time_remaining_seconds || 0);
        // Load chat messages (mock for now)
        setChatMessages([
          { sender: 'seller', text: 'Hi! Please transfer to the account details shown above.', time: '2 min ago' },
          { sender: 'buyer', text: 'Payment sent! Uploading proof now.', time: '1 min ago' }
        ]);
      }
    } catch (error) {
      console.error('Error loading trade:', error);
      toast.error('Failed to load trade details');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    try {
      const response = await axios.post(`${API}/api/p2p/mark-paid`, {
        trade_id: tradeId,
        buyer_id: user.user_id
      });
      
      if (response.data.success) {
        toast.success('Payment marked as complete!');
        loadTradeDetails();
      }
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast.error('Failed to mark as paid');
    }
  };

  const handleReleaseCrypto = () => {
    setShowOtpModal(true);
  };

  const confirmRelease = async () => {
    try {
      const response = await axios.post(`${API}/api/p2p/release-crypto`, {
        trade_id: tradeId,
        seller_id: user.user_id,
        otp_code: otpCode
      });
      
      if (response.data.success) {
        toast.success('Crypto released successfully!');
        setShowOtpModal(false);
        loadTradeDetails();
      }
    } catch (error) {
      console.error('Error releasing crypto:', error);
      toast.error('Failed to release crypto');
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      setChatMessages([...chatMessages, {
        sender: user.user_id === trade?.buyer_id ? 'buyer' : 'seller',
        text: newMessage,
        time: 'Just now'
      }]);
      setNewMessage('');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading trade...</div>
      </div>
    );
  }

  if (!trade) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Trade not found</div>
      </div>
    );
  }

  const isBuyer = user?.user_id === trade.buyer_id;
  const isSeller = user?.user_id === trade.seller_id;
  
  // console.log('User:', user?.user_id, 'Buyer:', trade.buyer_id, 'Seller:', trade.seller_id);
  // console.log('isBuyer:', isBuyer, 'isSeller:', isSeller, 'Trade Status:', trade.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => navigate('/p2p-marketplace')} className="text-cyan-400 mb-4">
            ← Back to Marketplace
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">Trade #{trade.trade_id?.slice(0, 8)}</h1>
            <div className="flex items-center gap-4">
              {timeRemaining > 0 && (
                <div className="flex items-center gap-2 bg-orange-900/30 px-6 py-3 rounded-xl border border-orange-500/30">
                  <IoTime className="w-6 h-6 text-orange-400" />
                  <div>
                    <div className="text-orange-400 font-bold text-2xl">{formatTime(timeRemaining)}</div>
                    <div className="text-orange-300 text-xs">Time remaining</div>
                  </div>
                </div>
              )}
              {/* Notification Bell */}
              {user?.user_id && (
                <P2PNotifications 
                  userId={user.user_id} 
                  tradeId={tradeId}
                  onNotificationClick={(notification) => {
                    // Handle notification click (e.g., scroll to relevant section)
                    if (notification.notification_type === 'message_received') {
                      document.getElementById('chat-section')?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Dispute Banner */}
        {trade.status === 'disputed' && (
          <div className="bg-gradient-to-r from-red-900/50 to-orange-900/50 border-2 border-red-500 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <IoAlertCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-red-300 mb-2">⚠️ Dispute In Progress</h3>
                <p className="text-gray-300 mb-3">
                  This trade is under admin review. Both parties can submit evidence and communicate with the admin.
                  The losing party will be charged a £5 dispute fee.
                </p>
                {dispute && (
                  <div className="bg-black/20 rounded-lg p-4 mb-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-400">Dispute ID:</span>
                        <span className="text-white ml-2 font-mono">{dispute.dispute_id?.slice(0, 8)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Status:</span>
                        <span className="text-orange-400 ml-2 font-semibold">{dispute.status}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Opened:</span>
                        <span className="text-white ml-2">{new Date(dispute.created_at).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Reason:</span>
                        <span className="text-white ml-2 capitalize">{dispute.reason?.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setShowDisputeChatModal(true)}
                  className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-all"
                >
                  View Dispute Chat
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Trade Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <IoShield className="w-6 h-6 text-cyan-400" />
                <h2 className="text-xl font-semibold text-white">Trade Status</h2>
              </div>
              <div className="flex items-center gap-3">
                {trade.status === 'waiting_payment' && (
                  <>
                    <IoAlertCircle className="w-8 h-8 text-yellow-400" />
                    <div>
                      <div className="text-yellow-400 font-bold text-lg">Waiting for Payment</div>
                      <div className="text-gray-400 text-sm">Buyer must complete payment</div>
                    </div>
                  </>
                )}
                {trade.status === 'paid' && (
                  <>
                    <IoCheckmarkCircle className="w-8 h-8 text-green-400" />
                    <div>
                      <div className="text-green-400 font-bold text-lg">Payment Received</div>
                      <div className="text-gray-400 text-sm">Waiting for seller to release crypto</div>
                    </div>
                  </>
                )}
                {trade.status === 'completed' && (
                  <>
                    <IoCheckmarkCircle className="w-8 h-8 text-green-400" />
                    <div>
                      <div className="text-green-400 font-bold text-lg">Completed</div>
                      <div className="text-gray-400 text-sm">Trade completed successfully</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Escrow Status */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-cyan-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <IoShield className="w-6 h-6 text-cyan-400" />
                <h2 className="text-xl font-semibold text-white">Escrow Protection</h2>
              </div>
              <div className={`border rounded-lg p-4 ${
                trade.status === 'completed' 
                  ? 'bg-green-900/20 border-green-500/30' 
                  : 'bg-cyan-900/20 border-cyan-500/30'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">Amount in Escrow:</span>
                  <span className="text-cyan-400 font-bold text-lg">{trade.crypto_amount} {trade.crypto_currency}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Escrow Status:</span>
                  {trade.status === 'completed' ? (
                    <span className="text-green-400 font-semibold">✓ Released</span>
                  ) : trade.escrow_locked ? (
                    <span className="text-yellow-400 font-semibold">🔒 Locked</span>
                  ) : (
                    <span className="text-gray-400 font-semibold">○ Not Locked</span>
                  )}
                </div>
                <div className="mt-3 text-xs text-gray-400">
                  {trade.status === 'completed' ? (
                    '✅ Funds have been successfully released to the buyer.'
                  ) : (
                    '🔒 Funds are safely held in escrow and will be released once seller confirms payment.'
                  )}
                </div>
              </div>
            </div>

            {/* Trade Details */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Trade Details</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount:</span>
                  <span className="text-white font-semibold">{trade.crypto_amount} {trade.crypto_currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Price:</span>
                  <span className="text-white font-semibold">£{trade.price_per_unit?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total:</span>
                  <span className="text-white font-bold text-lg">£{trade.fiat_amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Payment Method:</span>
                  <span className="text-white">{trade.payment_method}</span>
                </div>
                {isBuyer && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Seller:</span>
                    <span className="text-white">John Seller ⭐</span>
                  </div>
                )}
                {isSeller && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Buyer:</span>
                    <span className="text-white">gads21083</span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Instructions (for buyer) */}
            {isBuyer && trade.status === 'waiting_payment' && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/30 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">💳 Payment Instructions</h2>
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 space-y-2">
                  <div><span className="text-gray-400">Bank:</span> <span className="text-white">HSBC</span></div>
                  <div><span className="text-gray-400">Account:</span> <span className="text-white">12345678</span></div>
                  <div><span className="text-gray-400">Sort Code:</span> <span className="text-white">40-47-84</span></div>
                  <div><span className="text-gray-400">Reference:</span> <span className="text-cyan-400 font-mono">TRADE{trade.trade_id?.slice(0, 8)}</span></div>
                </div>
                <div className="mt-4 text-sm text-yellow-400">
                  ⚠️ Please include the reference code in your transfer!
                </div>
              </div>
            )}

            {/* Upload Proof */}
            {isBuyer && trade.status === 'waiting_payment' && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">📎 Upload Payment Proof</h2>
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-cyan-500 transition-colors cursor-pointer">
                  <IoCloudUpload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <input type="file" className="hidden" id="proof-upload" onChange={(e) => setProofFile(e.target.files[0])} />
                  <label htmlFor="proof-upload" className="cursor-pointer">
                    <div className="text-white mb-2">Click to upload or drag and drop</div>
                    <div className="text-gray-400 text-sm">PNG, JPG or PDF (max. 5MB)</div>
                  </label>
                  {proofFile && (
                    <div className="mt-4 text-green-400">✓ {proofFile.name}</div>
                  )}
                </div>
              </div>
            )}

            {/* Seller: Payment Proof View */}
            {isSeller && trade.status === 'paid' && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-green-500/30 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">✅ Buyer Marked Payment Complete</h2>
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                  <div className="text-green-400 font-semibold mb-2">Payment Confirmation Received</div>
                  <div className="text-gray-300 text-sm mb-3">
                    The buyer has marked the payment as complete. Please verify the payment in your bank account before releasing crypto.
                  </div>
                  <div className="text-xs text-yellow-400">
                    ⚠️ Only release crypto after confirming the payment has arrived in your account!
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              {isBuyer && trade.status === 'waiting_payment' && (
                <button
                  onClick={handleMarkPaid}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl transition-colors shadow-lg hover:shadow-green-500/50"
                >
                  ✓ I Have Paid
                </button>
              )}
              {isSeller && trade.status === 'paid' && (
                <button
                  onClick={handleReleaseCrypto}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 px-6 rounded-xl transition-colors shadow-lg hover:shadow-cyan-500/50"
                >
                  🔓 Release Crypto
                </button>
              )}
              {trade.status === 'completed' && (
                <div className="flex-1 bg-green-900/30 border border-green-500/30 text-green-400 font-bold py-4 px-6 rounded-xl text-center">
                  ✅ Trade Completed
                </div>
              )}
              {(trade.status === 'waiting_payment' || trade.status === 'paid') && (
                <>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to cancel this trade? Funds will be returned to seller.')) {
                        // Cancel trade logic
                        toast.info('Cancel trade functionality coming soon');
                      }
                    }}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-4 rounded-xl transition-colors"
                  >
                    Cancel Trade
                  </button>
                  <button
                    onClick={() => setShowDisputeModal(true)}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-4 rounded-xl transition-colors"
                  >
                    Open Dispute
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Column - Chat */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 h-[600px] flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <IoChatbubbles className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-semibold text-white">Chat</h2>
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.sender === 'buyer' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      msg.sender === 'buyer' 
                        ? 'bg-cyan-600 text-white' 
                        : 'bg-slate-700 text-gray-200'
                    }`}>
                      <div className="text-sm">{msg.text}</div>
                      <div className="text-xs opacity-70 mt-1">{msg.time}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type message..."
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                />
                <button
                  onClick={handleSendMessage}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* OTP Modal */}
      <OTPModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        onVerify={async (code) => {
          try {
            const response = await axios.post(`${API}/api/crypto-market/release-crypto`, {
              order_id: tradeId,
              otp_code: code,
              seller_id: user.user_id
            });
            
            if (response.data.success) {
              toast.success('Crypto released successfully!');
              setShowOtpModal(false);
              loadTradeDetails();
            } else {
              toast.error(response.data.message || 'Failed to release crypto');
            }
          } catch (error) {
            console.error('Error releasing crypto:', error);
            toast.error(error.response?.data?.detail || 'Failed to release crypto');
          }
        }}
        title="🔐 Confirm Release"
        description={trade ? `You are about to release ${trade.crypto_amount} ${trade.crypto_currency} to the buyer. Enter the 6-digit OTP code sent to your email.` : 'Verify your identity to release crypto.'}
        userId={user?.user_id}
        action="p2p_release"
      />

      {/* Dispute Modal */}
      <DisputeModal
        isOpen={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        tradeId={tradeId}
        userId={user?.user_id}
        onDisputeCreated={(newDispute) => {
          setDispute(newDispute);
          setShowDisputeModal(false);
          loadTradeDetails();
        }}
      />

      {/* Dispute Chat Modal */}
      {dispute && (
        <DisputeChatModal
          isOpen={showDisputeChatModal}
          onClose={() => setShowDisputeChatModal(false)}
          disputeId={dispute.dispute_id}
          userId={user?.user_id}
          userRole={user?.user_id === trade?.buyer_id ? 'buyer' : 'seller'}
        />
      )}
    </div>
  );
}
