import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '@/components/Layout';
import { IoCheckmarkCircle, IoClose, IoSend, IoCloudUpload, IoWarning, IoTime, IoShield, IoEyeOff } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

export default function P2POrderPage() {
  const { t } = useTranslation();
  const { tradeId } = useParams();
  const navigate = useNavigate();
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [paymentProof, setPaymentProof] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState('positive');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [checkingBlock, setCheckingBlock] = useState(true);

  // Show feedback modal for completed trades
  useEffect(() => {
    if (trade && trade.status === 'completed' && !showFeedbackModal) {
      // Check if user already left feedback
      const checkFeedback = async () => {
        try {
          const response = await axios.get(`${API}/api/p2p/trade/${tradeId}/feedback-check?user_id=${currentUser?.user_id}`);
          if (!response.data.feedback_given) {
            setTimeout(() => setShowFeedbackModal(true), 1000);
          }
        } catch (error) {
          // If endpoint doesn't exist, show modal anyway
          setTimeout(() => setShowFeedbackModal(true), 1000);
        }
      };
      if (currentUser) checkFeedback();
    }
  }, [trade?.status, currentUser]);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const user = JSON.parse(userData);
    setCurrentUser(user);
    fetchTrade(user.user_id);
    
    // Poll for updates
    const interval = setInterval(() => fetchTrade(user.user_id), 5000);
    return () => clearInterval(interval);
  }, [tradeId, navigate]);

  // Check block status when trade is loaded
  useEffect(() => {
    if (trade && currentUser) {
      const counterpartyId = isBuyer ? trade.seller_id : trade.buyer_id;
      checkBlockStatus(counterpartyId);
    }
  }, [trade, currentUser]);

  useEffect(() => {
    if (trade && trade.expires_at) {
      const updateCountdown = setInterval(() => {
        const now = new Date();
        const expires = new Date(trade.expires_at);
        const remaining = Math.floor((expires - now) / 1000);
        if (remaining <= 0) {
          setCountdown(0);
          clearInterval(updateCountdown);
        } else {
          setCountdown(remaining);
        }
      }, 1000);
      return () => clearInterval(updateCountdown);
    }
  }, [trade]);

  const fetchTrade = async (userId) => {
    try {
      const response = await axios.get(`${API}/api/p2p/trade/${tradeId}?user_id=${userId}`);
      if (response.data.success) {
        setTrade(response.data.trade);
        if (response.data.messages) {
          setMessages(response.data.messages);
        }
        
        // Check if this trade involves a blocked user
        if (response.data.blocked) {
          toast.error('This trade involves a blocked user. Redirecting...');
          setTimeout(() => navigate('/p2p'), 2000);
        }
      }
    } catch (error) {
      console.error('Error fetching trade:', error);
      if (error.response?.status === 403) {
        toast.error('Access denied: User is blocked');
        navigate('/p2p');
      } else {
        toast.error('Failed to load trade details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !paymentProof) return;
    
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('trade_id', tradeId);
      formData.append('sender_id', currentUser.user_id);
      formData.append('message', newMessage);
      if (paymentProof) {
        formData.append('attachment', paymentProof);
      }
      
      const response = await axios.post(`${API}/api/p2p/trade/message`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        setNewMessage('');
        setPaymentProof(null);
        fetchTrade(currentUser.user_id);
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkAsPaid = async () => {
    setProcessing(true);
    try {
      const response = await axios.post(`${API}/api/p2p/trade/mark-paid`, {
        trade_id: tradeId,
        user_id: currentUser.user_id
      });
      
      if (response.data.success) {
        toast.success(t('p2p.paymentMarkedSuccess'));
        fetchTrade(currentUser.user_id);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to mark as paid');
    } finally {
      setProcessing(false);
    }
  };

  const handleReleaseCrypto = async () => {
    setProcessing(true);
    try {
      const response = await axios.post(`${API}/api/p2p/trade/release`, {
        trade_id: tradeId,
        user_id: currentUser.user_id
      });
      
      if (response.data.success) {
        toast.success('✅ Crypto released successfully!');
        fetchTrade(currentUser.user_id);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to release crypto');
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenDispute = async () => {
    if (!disputeReason.trim()) {
      toast.error('Please provide a reason for dispute');
      return;
    }
    
    setProcessing(true);
    try {
      const response = await axios.post(`${API}/api/p2p/trade/dispute`, {
        trade_id: tradeId,
        user_id: currentUser.user_id,
        reason: disputeReason
      });
      
      if (response.data.success) {
        toast.success(t('p2p.disputeOpened'));
        setShowDisputeModal(false);
        fetchTrade(currentUser.user_id);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to open dispute');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    
    setProcessing(true);
    try {
      const response = await axios.post(`${API}/api/p2p/trade/cancel`, {
        trade_id: tradeId,
        user_id: currentUser.user_id
      });
      
      if (response.data.success) {
        toast.success('Order cancelled');
        fetchTrade(currentUser.user_id);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel');
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackComment.trim() && feedbackRating === '') {
      toast.error('Please provide a rating');
      return;
    }
    
    setProcessing(true);
    try {
      const response = await axios.post(`${API}/api/p2p/trade/${tradeId}/feedback`, {
        from_user_id: currentUser.user_id,
        rating: feedbackRating,
        comment: feedbackComment.trim()
      });
      
      if (response.data.success) {
        toast.success('✅ Feedback submitted!');
        setShowFeedbackModal(false);
        setFeedbackRating('positive');
        setFeedbackComment('');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit feedback');
    } finally {
      setProcessing(false);
    }
  };

  const checkBlockStatus = async (counterpartyId) => {
    try {
      const response = await axios.get(`${API}/api/p2p/blocked/${currentUser.user_id}`);
      if (response.data.success) {
        const blockedList = response.data.blocked_users || [];
        setIsBlocked(blockedList.includes(counterpartyId));
      }
    } catch (error) {
      console.error('Error checking block status:', error);
    } finally {
      setCheckingBlock(false);
    }
  };

  const handleBlockToggle = async () => {
    const counterpartyId = isBuyer ? trade.seller_id : trade.buyer_id;
    setProcessing(true);
    
    try {
      const endpoint = isBlocked ? '/api/p2p/block/remove' : '/api/p2p/block/add';
      const response = await axios.post(`${API}${endpoint}`, {
        user_id: currentUser.user_id,
        blocked_user_id: counterpartyId
      });
      
      if (response.data.success) {
        setIsBlocked(!isBlocked);
        toast.success(isBlocked ? '✅ User unblocked - Marketplace will update' : '🚫 User blocked - Redirecting to marketplace...');
        
        // If blocked a favourite, remove from favourites
        if (!isBlocked) {
          try {
            await axios.post(`${API}/api/p2p/favourites/remove`, {
              user_id: currentUser.user_id,
              merchant_id: counterpartyId
            });
          } catch (e) {
            console.error('Failed to remove from favourites:', e);
          }
        }
        
        // Redirect to marketplace after blocking so user sees updated list
        setTimeout(() => {
          navigate('/p2p');
        }, 1500);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update block status');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>Loading...</div>
      </Layout>
    );
  }

  if (!trade) {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>Trade not found</div>
      </Layout>
    );
  }

  const isBuyer = currentUser?.user_id === trade.buyer_id;
  const counterparty = isBuyer ? 'Seller' : 'Buyer';

  return (
    <Layout>
      <div style={{ minHeight: '100vh', padding: '40px 20px', background: 'linear-gradient(180deg, #05121F 0%, #071E2C 100%)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
            border: '1px solid rgba(0, 198, 255, 0.2)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#FFFFFF' }}>
                {isBuyer ? 'Buy' : 'Sell'} {trade.crypto_currency}
              </h1>
              <div style={{
                padding: '8px 16px',
                background: trade.status === 'completed' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 165, 0, 0.1)',
                border: `1px solid ${trade.status === 'completed' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 165, 0, 0.3)'}`,
                borderRadius: '8px',
                color: trade.status === 'completed' ? '#22C55E' : '#FFA500',
                fontWeight: '600'
              }}>
                {trade.status === 'pending_payment' ? 'Waiting for Payment' :
                 trade.status === 'payment_made' ? 'Payment Made' :
                 trade.status === 'completed' ? 'Completed' :
                 trade.status === 'cancelled' ? 'Cancelled' :
                 trade.status === 'disputed' ? 'Disputed' : trade.status}
              </div>
            </div>
            
            {countdown > 0 && trade.status === 'pending_payment' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px'
              }}>
                <IoTime size={20} color="#EF4444" />
                <span style={{ color: '#EF4444', fontWeight: '600' }}>
                  Time remaining: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
            
            {/* Left Column */}
            <div>
              {/* Order Details */}
              <div style={{
                background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
                border: '1px solid rgba(0, 198, 255, 0.2)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF', marginBottom: '16px' }}>Order Details</h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8F9BB3' }}>Amount</span>
                    <span style={{ color: '#FFFFFF', fontWeight: '600' }}>{trade.crypto_amount} {trade.crypto_currency}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8F9BB3' }}>Price</span>
                    <span style={{ color: '#FFFFFF', fontWeight: '600' }}>£{(trade.fiat_amount / trade.crypto_amount).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8F9BB3' }}>Total</span>
                    <span style={{ color: '#00C6FF', fontWeight: '700', fontSize: '20px' }}>£{trade.fiat_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Instructions - Only for Buyer */}
              {isBuyer && trade.seller_payment_details && trade.status === 'pending_payment' && (
                <div style={{
                  background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
                  border: '1px solid rgba(255, 165, 0, 0.3)',
                  borderRadius: '16px',
                  padding: '24px',
                  marginBottom: '24px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <IoShield size={24} color="#FFA500" />
                    <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF' }}>Payment Instructions</h3>
                  </div>
                  <div style={{ background: 'rgba(255, 165, 0, 0.05)', padding: '16px', borderRadius: '8px' }}>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '4px' }}>Bank Name</div>
                        <div style={{ color: '#FFFFFF', fontWeight: '600' }}>{trade.seller_payment_details.bank_name}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '4px' }}>Account Name</div>
                        <div style={{ color: '#FFFFFF', fontWeight: '600' }}>{trade.seller_payment_details.account_name}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '4px' }}>Account Number</div>
                        <div style={{ color: '#FFFFFF', fontWeight: '600' }}>{trade.seller_payment_details.account_number}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '4px' }}>Sort Code</div>
                        <div style={{ color: '#FFFFFF', fontWeight: '600' }}>{trade.seller_payment_details.sort_code}</div>
                      </div>
                      {trade.seller_payment_details.notes && (
                        <div>
                          <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '4px' }}>Notes</div>
                          <div style={{ color: '#FFA500' }}>{trade.seller_payment_details.notes}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {isBuyer && trade.status === 'pending_payment' && (
                  <button
                    onClick={handleMarkAsPaid}
                    disabled={processing}
                    style={{
                      flex: 1,
                      padding: '16px',
                      background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '16px',
                      fontWeight: '700',
                      cursor: processing ? 'not-allowed' : 'pointer',
                      boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)'
                    }}
                  >
                    <IoCheckmarkCircle size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    Mark as Paid
                  </button>
                )}

                {!isBuyer && trade.status === 'payment_made' && (
                  <button
                    onClick={handleReleaseCrypto}
                    disabled={processing}
                    style={{
                      flex: 1,
                      padding: '16px',
                      background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '16px',
                      fontWeight: '700',
                      cursor: processing ? 'not-allowed' : 'pointer',
                      boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)'
                    }}
                  >
                    Release Crypto
                  </button>
                )}

                {trade.status === 'completed' && (
                  <button
                    onClick={() => setShowFeedbackModal(true)}
                    style={{
                      flex: 1,
                      padding: '16px',
                      background: 'linear-gradient(135deg, #FFA500, #FF8C00)',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '16px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 0 20px rgba(255, 165, 0, 0.4)'
                    }}
                  >
                    ⭐ Rate This Trade
                  </button>
                )}

                {trade.status !== 'completed' && trade.status !== 'cancelled' && trade.status !== 'disputed' && (
                  <>
                    <button
                      onClick={() => setShowDisputeModal(true)}
                      disabled={processing}
                      style={{
                        padding: '16px 24px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '12px',
                        color: '#EF4444',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: processing ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <IoWarning size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                      Dispute
                    </button>

                    {isBuyer && trade.status === 'pending_payment' && (
                      <button
                        onClick={handleCancel}
                        disabled={processing}
                        style={{
                          padding: '16px 24px',
                          background: 'rgba(143, 155, 179, 0.1)',
                          border: '1px solid rgba(143, 155, 179, 0.3)',
                          borderRadius: '12px',
                          color: '#8F9BB3',
                          fontSize: '16px',
                          fontWeight: '600',
                          cursor: processing ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Cancel Order
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Right Column - Chat */}
            <div style={{
              background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
              border: '1px solid rgba(0, 198, 255, 0.2)',
              borderRadius: '16px',
              padding: '24px',
              height: 'fit-content'
            }}>
              {/* Chat Header with Block Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>Chat with {counterparty}</h3>
                {!checkingBlock && (
                  <button
                    onClick={handleBlockToggle}
                    disabled={processing}
                    title={isBlocked ? 'Unblock user' : 'Block user'}
                    style={{
                      padding: '8px 16px',
                      background: isBlocked ? 'rgba(239, 68, 68, 0.1)' : 'rgba(143, 155, 179, 0.1)',
                      border: `1px solid ${isBlocked ? 'rgba(239, 68, 68, 0.3)' : 'rgba(143, 155, 179, 0.3)'}`,
                      borderRadius: '8px',
                      color: isBlocked ? '#EF4444' : '#8F9BB3',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: processing ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <IoEyeOff size={14} />
                    {isBlocked ? 'Unblock' : 'Block'}
                  </button>
                )}
              </div>
              
              <div style={{
                height: '400px',
                overflowY: 'auto',
                marginBottom: '16px',
                padding: '12px',
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '8px'
              }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#8F9BB3', padding: '40px' }}>No messages yet</div>
                ) : (
                  messages.map((msg, idx) => {
                    const isSystem = msg.sender_id === 'SYSTEM';
                    const isCurrentUser = msg.sender_id === currentUser.user_id;
                    
                    return (
                      <div key={idx} style={{
                        marginBottom: '12px',
                        padding: '12px',
                        background: isSystem 
                          ? 'rgba(255, 165, 0, 0.15)'
                          : isCurrentUser 
                            ? 'rgba(0, 198, 255, 0.1)' 
                            : 'rgba(143, 155, 179, 0.1)',
                        border: isSystem ? '1px solid rgba(255, 165, 0, 0.3)' : 'none',
                        borderRadius: '8px',
                        textAlign: isSystem ? 'center' : isCurrentUser ? 'right' : 'left'
                      }}>
                        <div style={{ 
                          fontSize: '11px', 
                          color: isSystem ? '#FFA500' : '#8F9BB3', 
                          marginBottom: '4px',
                          fontWeight: isSystem ? '700' : '600'
                        }}>
                          {isSystem ? '🤖 SYSTEM' : isCurrentUser ? 'You' : counterparty}
                          {msg.timestamp && (
                            <span style={{ marginLeft: '8px', fontSize: '10px', opacity: 0.7 }}>
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <div style={{ 
                          color: isSystem ? '#FFA500' : '#FFFFFF',
                          fontWeight: isSystem ? '600' : '400'
                        }}>
                          {msg.message}
                        </div>
                        {msg.attachment && (
                          <img 
                            src={msg.attachment} 
                            alt="proof" 
                            style={{ 
                              maxWidth: '200px', 
                              marginTop: '8px', 
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                            onClick={() => window.open(msg.attachment, '_blank')}
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(0, 198, 255, 0.2)',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontSize: '14px'
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={processing || (!newMessage.trim() && !paymentProof)}
                    style={{
                      padding: '12px 20px',
                      background: 'linear-gradient(135deg, #00C6FF, #0099CC)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      cursor: processing ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <IoSend size={20} />
                  </button>
                </div>
                
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPaymentProof(e.target.files[0])}
                    id="proof-upload"
                    style={{ display: 'none' }}
                  />
                  <label
                    htmlFor="proof-upload"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      background: 'rgba(0, 198, 255, 0.1)',
                      border: '1px solid rgba(0, 198, 255, 0.3)',
                      borderRadius: '8px',
                      color: '#00C6FF',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    <IoCloudUpload size={20} />
                    {paymentProof ? paymentProof.name : 'Upload Payment Proof'}
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '480px',
            width: '90%'
          }}>
            <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF', marginBottom: '16px' }}>Open Dispute</h3>
            <p style={{ color: '#8F9BB3', marginBottom: '16px' }}>Please explain why you are opening a dispute. Admin will review and resolve.</p>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Describe the issue..."
              style={{
                width: '100%',
                height: '120px',
                padding: '12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontSize: '14px',
                marginBottom: '16px',
                resize: 'vertical'
              }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowDisputeModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'rgba(143, 155, 179, 0.1)',
                  border: '1px solid rgba(143, 155, 179, 0.3)',
                  borderRadius: '8px',
                  color: '#8F9BB3',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleOpenDispute}
                disabled={processing || !disputeReason.trim()}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  cursor: processing || !disputeReason.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                Submit Dispute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
            border: '1px solid rgba(0, 198, 255, 0.3)',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '480px',
            width: '90%'
          }}>
            <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF', marginBottom: '16px' }}>
              Rate Your Counterparty
            </h3>
            <p style={{ color: '#8F9BB3', marginBottom: '20px' }}>
              How was your experience with {counterparty}?
            </p>
            
            {/* Rating Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#8F9BB3', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                Rating *
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {['positive', 'neutral', 'negative'].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setFeedbackRating(rating)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: feedbackRating === rating 
                        ? rating === 'positive' ? 'rgba(34, 197, 94, 0.2)' 
                        : rating === 'neutral' ? 'rgba(255, 165, 0, 0.2)'
                        : 'rgba(239, 68, 68, 0.2)'
                        : 'rgba(143, 155, 179, 0.1)',
                      border: feedbackRating === rating 
                        ? rating === 'positive' ? '2px solid #22C55E' 
                        : rating === 'neutral' ? '2px solid #FFA500'
                        : '2px solid #EF4444'
                        : '1px solid rgba(143, 155, 179, 0.3)',
                      borderRadius: '8px',
                      color: feedbackRating === rating 
                        ? rating === 'positive' ? '#22C55E' 
                        : rating === 'neutral' ? '#FFA500'
                        : '#EF4444'
                        : '#8F9BB3',
                      fontWeight: feedbackRating === rating ? '700' : '400',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    {rating === 'positive' ? '👍 Positive' : rating === 'neutral' ? '😐 Neutral' : '👎 Negative'}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#8F9BB3', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                Comment (Optional)
              </label>
              <textarea
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="Share your experience... (max 500 characters)"
                maxLength={500}
                style={{
                  width: '100%',
                  height: '100px',
                  padding: '12px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(0, 198, 255, 0.3)',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
              <div style={{ textAlign: 'right', fontSize: '12px', color: '#8F9BB3', marginTop: '4px' }}>
                {feedbackComment.length}/500
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowFeedbackModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'rgba(143, 155, 179, 0.1)',
                  border: '1px solid rgba(143, 155, 179, 0.3)',
                  borderRadius: '8px',
                  color: '#8F9BB3',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Skip
              </button>
              <button
                onClick={handleSubmitFeedback}
                disabled={processing}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  opacity: processing ? 0.6 : 1
                }}
              >
                {processing ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
