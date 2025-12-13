import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { IoChatbubbles, IoCheckmark as Check, IoCheckmarkCircle, IoClose, IoCloudUpload, IoDocument, IoSend, IoTime, IoWarning } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function OrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [showEvidenceDialog, setShowEvidenceDialog] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [evidenceType, setEvidenceType] = useState('screenshot');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/');
      return;
    }
    const user = JSON.parse(userData);
    setCurrentUser(user);
    fetchOrderDetails(user.user_id);
  }, [orderId, navigate]);

  const fetchOrderDetails = async (userId) => {
    try {
      const ordersResp = await axios.get(`${API}/crypto-market/orders/${userId}`);
      const allOrders = [...ordersResp.data.buy_orders, ...ordersResp.data.sell_orders];
      const foundOrder = allOrders.find(o => o.order_id === orderId);
      
      if (foundOrder) {
        setOrder(foundOrder);
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateDispute = async () => {
    if (!disputeReason.trim()) {
      toast.error('Please provide a reason for the dispute');
      return;
    }

    setProcessing(true);
    try {
      const response = await axios.post(`${API}/disputes/initiate`, {
        user_address: currentUser.user_id,
        order_id: orderId,
        reason: disputeReason,
      });

      if (response.data.success) {
        toast.success('Dispute opened! Crypto is now locked in escrow.');
        setShowDisputeDialog(false);
        setDisputeReason('');
        setDispute(response.data.dispute);
        fetchOrderDetails(currentUser.user_id);
      }
    } catch (error) {
      console.error('Error initiating dispute:', error);
      toast.error(error.response?.data?.detail || 'Failed to initiate dispute');
    } finally {
      setProcessing(false);
    }
  };

  const handleUploadEvidence = async () => {
    if (!evidenceDescription.trim()) {
      toast.error('Please provide evidence description');
      return;
    }

    if (!dispute) {
      toast.error('No active dispute found');
      return;
    }

    setProcessing(true);
    try {
      const response = await axios.post(`${API}/disputes/evidence`, {
        dispute_id: dispute.dispute_id,
        uploaded_by: currentUser.user_id,
        evidence_type: evidenceType,
        description: evidenceDescription,
        file_url: null,
      });

      if (response.data.success) {
        toast.success('Evidence uploaded successfully');
        setShowEvidenceDialog(false);
        setEvidenceDescription('');
      }
    } catch (error) {
      console.error('Error uploading evidence:', error);
      toast.error('Failed to upload evidence');
    } finally {
      setProcessing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !dispute) return;

    try {
      const userRole = order.buyer_id === currentUser.user_id ? 'buyer' : 'seller';
      
      const response = await axios.post(`${API}/disputes/message`, {
        dispute_id: dispute.dispute_id,
        sender_address: currentUser.user_id,
        sender_role: userRole,
        message: newMessage,
      });

      if (response.data.success) {
        setMessages([...messages, response.data.message]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }} data-testid="loading-spinner">
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid rgba(0, 240, 255, 0.3)',
            borderTopColor: '#00F0FF',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div style={{
          maxWidth: '600px',
          margin: '4rem auto',
          padding: '3rem 2rem',
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05))',
          border: '2px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '16px'
        }}>
          <IoWarning size={64} color="#EF4444" style={{ marginBottom: '1.5rem' }} />
          <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#FFFFFF', marginBottom: '1rem' }}>Order Not Found</h3>
          <button
            onClick={() => navigate('/my-orders')}
            style={{
              padding: '0.75rem 2rem',
              background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
              border: 'none',
              borderRadius: '10px',
              color: '#000000',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              marginTop: '1rem'
            }}
          >
            Go Back
          </button>
        </div>
      </Layout>
    );
  }

  const isBuyer = order.buyer_id === currentUser?.user_id;

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#22C55E';
      case 'disputed': return '#F59E0B';
      case 'cancelled': return '#EF4444';
      default: return '#00F0FF';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <IoCheckmarkCircle size={20} />;
      case 'disputed': return <IoWarning size={20} />;
      default: return <IoTime size={20} />;
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }} data-testid="order-details-page">
        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ 
              fontSize: '2rem', 
              fontWeight: '900', 
              marginBottom: '0.5rem',
              background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }} data-testid="order-title">
              Order Details
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Order ID: {orderId.slice(0, 12)}...</p>
          </div>
          <button
            onClick={() => navigate('/my-orders')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(0, 240, 255, 0.1)',
              border: '2px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '10px',
              color: '#00F0FF',
              fontSize: '0.9375rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Back to Orders
          </button>
        </div>

        {/* Order Status Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.05), rgba(168, 85, 247, 0.05))',
          border: '2px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem'
        }} data-testid="order-status">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.375rem', fontWeight: '700', color: '#FFFFFF' }}>Order Status</h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: `${getStatusColor(order.status)}20`,
              border: `2px solid ${getStatusColor(order.status)}`,
              borderRadius: '10px',
              color: getStatusColor(order.status),
              fontWeight: '700',
              fontSize: '0.875rem',
              textTransform: 'uppercase'
            }}>
              {getStatusIcon(order.status)}
              <span>{order.status.replace(/_/g, ' ')}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>Amount</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#FFFFFF' }}>{order.crypto_amount} {order.crypto_currency}</div>
            </div>
            <div style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>Total Price</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#FFFFFF' }}>£{order.fiat_amount?.toLocaleString()}</div>
            </div>
            <div style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>{isBuyer ? 'Seller' : 'Buyer'}</div>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#FFFFFF', fontFamily: 'monospace' }}>
                {isBuyer ? `${order.seller_id.slice(0, 8)}...` : `${order.buyer_id.slice(0, 8)}...`}
              </div>
            </div>
          </div>

          {order.status === 'disputed' && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '2px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <IoWarning size={24} color="#F59E0B" />
              <div>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#F59E0B', marginBottom: '0.25rem' }}>Crypto Locked in Escrow</div>
                <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>This order is under dispute. Crypto is securely held in escrow until admin resolution.</div>
              </div>
            </div>
          )}

          {order.status !== 'disputed' && order.status !== 'completed' && (
            <div style={{ marginTop: '1.5rem' }}>
              <button
                onClick={() => setShowDisputeDialog(true)}
                data-testid="open-dispute-btn"
                style={{
                  padding: '0.875rem 1.5rem',
                  background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#FFFFFF',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <IoWarning size={20} />
                Open Dispute
              </button>
            </div>
          )}
        </div>

        {/* Dispute Section */}
        {order.status === 'disputed' && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(251, 191, 36, 0.05))',
            border: '2px solid rgba(245, 158, 11, 0.2)',
            borderRadius: '16px',
            padding: '2rem'
          }} data-testid="dispute-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.375rem', fontWeight: '700', color: '#FFFFFF' }}>Dispute & Evidence</h3>
              <button
                onClick={() => setShowEvidenceDialog(true)}
                data-testid="upload-evidence-btn"
                style={{
                  padding: '0.75rem 1.25rem',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '2px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '10px',
                  color: '#F59E0B',
                  fontSize: '0.9375rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <IoCloudUpload size={18} />
                Upload Evidence
              </button>
            </div>

            <div style={{
              padding: '1.25rem',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '10px',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <IoDocument size={28} color="#F59E0B" />
              <div>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#FFFFFF', marginBottom: '0.25rem' }}>Provide Evidence</div>
                <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>Upload bank transfer screenshots, receipts, or any proof to support your case. Admin will review all evidence.</div>
              </div>
            </div>

            {/* Dispute Chat */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '10px',
              padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <IoChatbubbles size={20} color="#00F0FF" />
                <h4 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#FFFFFF' }}>Dispute Chat</h4>
              </div>
              
              <div style={{ minHeight: '200px', maxHeight: '400px', overflowY: 'auto', marginBottom: '1rem', padding: '1rem', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px' }}>
                {messages.length > 0 ? (
                  messages.map((msg) => (
                    <div key={msg.message_id} style={{
                      marginBottom: '1rem',
                      padding: '0.875rem',
                      background: msg.sender_address === currentUser?.user_id ? 'rgba(0, 240, 255, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${msg.sender_address === currentUser?.user_id ? '#00F0FF' : '#A855F7'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: '700', color: msg.sender_address === currentUser?.user_id ? '#00F0FF' : '#A855F7', textTransform: 'uppercase' }}>{msg.sender_role}</span>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>{new Date(msg.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p style={{ color: '#FFFFFF', fontSize: '0.9375rem' }}>{msg.message}</p>
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', padding: '2rem' }}>No messages yet. Start the conversation.</p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  data-testid="chat-input"
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '2px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '0.9375rem',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  data-testid="send-message-btn"
                  style={{
                    padding: '0.875rem 1.5rem',
                    background: 'linear-gradient(135deg, #00F0FF, #00B8E6)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#000000',
                    fontSize: '0.9375rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <IoSend size={18} />
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dispute Dialog */}
        {showDisputeDialog && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }} onClick={() => setShowDisputeDialog(false)} data-testid="dispute-dialog">
            <div style={{
              maxWidth: '600px',
              width: '100%',
              background: 'linear-gradient(135deg, rgba(30, 39, 73, 0.95), rgba(20, 27, 50, 0.95))',
              border: '2px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '16px',
              padding: '2rem',
              maxHeight: '90vh',
              overflowY: 'auto'
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#FFFFFF' }}>Open Dispute</h3>
                <button onClick={() => setShowDisputeDialog(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                  <IoClose size={24} />
                </button>
              </div>
              
              <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', border: '2px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem' }}>
                <IoWarning size={20} color="#F59E0B" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.9)' }}>Only open a dispute if there is a genuine issue. False disputes may affect your account.</p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.9375rem', fontWeight: '600', color: '#FFFFFF', marginBottom: '0.5rem' }}>Reason for Dispute *</label>
                <textarea
                  placeholder="Explain the issue (e.g., Payment sent but seller not releasing crypto, No payment received, etc.)"
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  rows={5}
                  data-testid="dispute-reason-input"
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '2px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '0.9375rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setShowDisputeDialog(false)}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '0.9375rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleInitiateDispute}
                  disabled={processing}
                  data-testid="submit-dispute-btn"
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    background: processing ? 'rgba(239, 68, 68, 0.5)' : 'linear-gradient(135deg, #EF4444, #DC2626)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '0.9375rem',
                    fontWeight: '600',
                    cursor: processing ? 'not-allowed' : 'pointer'
                  }}
                >
                  {processing ? 'Opening...' : 'Open Dispute'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Evidence Dialog */}
        {showEvidenceDialog && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }} onClick={() => setShowEvidenceDialog(false)} data-testid="evidence-dialog">
            <div style={{
              maxWidth: '600px',
              width: '100%',
              background: 'linear-gradient(135deg, rgba(30, 39, 73, 0.95), rgba(20, 27, 50, 0.95))',
              border: '2px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '16px',
              padding: '2rem',
              maxHeight: '90vh',
              overflowY: 'auto'
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#FFFFFF' }}>Upload Evidence</h3>
                <button onClick={() => setShowEvidenceDialog(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                  <IoClose size={24} />
                </button>
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.9375rem', fontWeight: '600', color: '#FFFFFF', marginBottom: '0.5rem' }}>Evidence Type</label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value)}
                  data-testid="evidence-type-select"
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '2px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '0.9375rem',
                    outline: 'none'
                  }}
                >
                  <option value="screenshot">Screenshot</option>
                  <option value="bank_statement">Bank Statement</option>
                  <option value="message">Message/Email</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.9375rem', fontWeight: '600', color: '#FFFFFF', marginBottom: '0.5rem' }}>Description *</label>
                <textarea
                  placeholder="Describe this evidence (e.g., Bank transfer confirmation showing payment of £3000 to seller's account)"
                  value={evidenceDescription}
                  onChange={(e) => setEvidenceDescription(e.target.value)}
                  rows={4}
                  data-testid="evidence-description-input"
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '2px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '0.9375rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', border: '2px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem' }}>
                <IoCloudUpload size={20} color="#F59E0B" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.9)' }}>In production: Upload actual files here. For this demo, description is sufficient.</p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setShowEvidenceDialog(false)}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '0.9375rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadEvidence}
                  disabled={processing}
                  data-testid="submit-evidence-btn"
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    background: processing ? 'rgba(245, 158, 11, 0.5)' : 'linear-gradient(135deg, #F59E0B, #F97316)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#000000',
                    fontSize: '0.9375rem',
                    fontWeight: '600',
                    cursor: processing ? 'not-allowed' : 'pointer'
                  }}
                >
                  {processing ? 'Uploading...' : 'Upload Evidence'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
