import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IoArrowBack, IoChatbubbles, IoCheckmark, IoCheckmarkCircle, IoClose as X, IoCloseCircle, IoCopy, IoInformationCircle, IoSend, IoShield, IoTime, IoWarning } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function TradePageNew() {
  const { tradeId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  
  const [user, setUser] = useState(null);
  const [trade, setTrade] = useState(null);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [copied, setCopied] = useState({});
  
  const isBuyer = trade && user && trade.buyer_id === user.user_id;
  const isSeller = trade && user && trade.seller_id === user.user_id;

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('cryptobank_user') || '{}');
    if (!userData.user_id) {
      toast.error('Please log in');
      navigate('/login');
      return;
    }
    setUser(userData);
    loadTradeDetails();
    loadMessages();
    
    const interval = setInterval(() => {
      loadTradeDetails();
      loadMessages();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [tradeId]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadTradeDetails = async () => {
    try {
      const response = await axios.get(`${API}/api/p2p/trade/${tradeId}`);
      setTrade(response.data.trade);
      setSeller(response.data.seller);
      setTimeLeft(response.data.time_remaining_seconds || 0);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load trade:', error);
      toast.error('Failed to load trade details');
    }
  };

  const loadMessages = async () => {
    try {
      const response = await axios.get(`${API}/api/p2p/trade/${tradeId}/messages`);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied({ ...copied, [key]: true });
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied({ ...copied, [key]: false }), 2000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMarkAsPaid = async () => {
    if (!window.confirm('⚠️ IMPORTANT: Have you transferred the payment to the seller?\n\nOnly click YES if you have actually sent the money.')) {
      return;
    }
    
    try {
      await axios.post(`${API}/api/p2p/mark-paid`, {
        trade_id: tradeId,
        buyer_id: user.user_id
      });
      toast.success('✅ Payment marked as sent! Waiting for seller confirmation.');
      await loadTradeDetails();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to mark as paid');
    }
  };

  const handleReleaseCrypto = async () => {
    if (!window.confirm('⚠️ IMPORTANT: Have you received the payment in your bank account?\n\nThis will release the crypto from escrow to the buyer.')) {
      return;
    }
    
    try {
      await axios.post(`${API}/api/p2p/release-crypto`, {
        trade_id: tradeId,
        seller_id: user.user_id
      });
      toast.success('✅ Crypto released successfully!');
      await loadTradeDetails();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to release crypto');
    }
  };

  const handleDispute = async () => {
    const reason = prompt('Please describe the issue with this trade:');
    if (!reason || reason.trim().length < 10) {
      toast.error('Please provide a detailed reason (minimum 10 characters)');
      return;
    }
    
    try {
      await axios.post(`${API}/api/p2p/raise-dispute`, {
        trade_id: tradeId,
        user_id: user.user_id,
        reason: reason.trim()
      });
      toast.success('🛡️ Dispute raised! Our support team will review shortly.');
      await loadTradeDetails();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to raise dispute');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    setSendingMessage(true);
    try {
      await axios.post(`${API}/api/p2p/trade/${tradeId}/message`, {
        user_id: user.user_id,
        message: newMessage.trim()
      });
      setNewMessage('');
      await loadMessages();
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusInfo = () => {
    if (!trade) return { text: '', color: '', icon: null, step: 0 };
    
    switch (trade.status) {
      case 'pending_payment':
        return {
          text: 'Waiting for Payment',
          color: '#F59E0B',
          icon: <IoTime size={20} />,
          step: 1
        };
      case 'payment_sent':
        return {
          text: 'Payment Sent - Awaiting Confirmation',
          color: '#3B82F6',
          icon: <IoTime size={20} />,
          step: 2
        };
      case 'completed':
        return {
          text: 'Trade Completed',
          color: '#22C55E',
          icon: <IoCheckmarkCircle size={20} />,
          step: 3
        };
      case 'disputed':
        return {
          text: 'Under Dispute',
          color: '#EF4444',
          icon: <IoWarning size={20} />,
          step: 0
        };
      case 'cancelled':
        return {
          text: 'Trade Cancelled',
          color: '#888',
          icon: <IoCloseCircle size={20} />,
          step: 0
        };
      default:
        return {
          text: 'Unknown Status',
          color: '#888',
          icon: <IoInformationCircle size={20} />,
          step: 0
        };
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div className="spinner" style={{
          border: '4px solid rgba(0, 240, 255, 0.1)',
          borderTop: '4px solid #00F0FF',
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  const statusInfo = getStatusInfo();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={() => navigate('/my-orders')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'none',
              border: 'none',
              color: '#00F0FF',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            <IoArrowBack size={16} />
            Back to Orders
          </button>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{
                fontSize: '28px',
                fontWeight: '900',
                color: '#fff',
                marginBottom: '0.5rem'
              }}>
                Trade Order #{tradeId.substring(0, 8)}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: statusInfo.color + '20',
                  border: `2px solid ${statusInfo.color}`,
                  borderRadius: '8px',
                  padding: '6px 16px',
                  color: statusInfo.color,
                  fontSize: '14px',
                  fontWeight: '700'
                }}>
                  {statusInfo.icon}
                  {statusInfo.text}
                </div>
                <div style={{
                  background: 'rgba(0, 240, 255, 0.1)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '6px 16px',
                  color: '#00F0FF',
                  fontSize: '13px',
                  fontWeight: '600'
                }}>
                  🛡️ Escrow Protected
                </div>
              </div>
            </div>

            {/* Timer - Binance Style */}
            {trade?.status === 'pending_payment' && timeLeft > 0 && (
              <div style={{
                textAlign: 'center',
                background: timeLeft < 300 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0, 240, 255, 0.2)',
                border: `2px solid ${timeLeft < 300 ? '#EF4444' : '#00F0FF'}`,
                borderRadius: '12px',
                padding: '1rem 2rem'
              }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Time Remaining
                </div>
                <div style={{
                  fontSize: '32px',
                  fontWeight: '900',
                  color: timeLeft < 300 ? '#EF4444' : '#00F0FF',
                  fontFamily: 'monospace'
                }}>
                  {formatTime(timeLeft)}
                </div>
                {timeLeft < 300 && (
                  <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px' }}>
                    ⚠️ Hurry! Time running out
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress Steps - Binance Style */}
        <div style={{
          background: 'rgba(26, 31, 58, 0.8)',
          border: '2px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            {/* Progress Line */}
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '10%',
              right: '10%',
              height: '4px',
              background: 'rgba(0, 240, 255, 0.1)',
              zIndex: 0
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, #00F0FF, #A855F7)',
                width: statusInfo.step === 3 ? '100%' : statusInfo.step === 2 ? '50%' : '0%',
                transition: 'width 0.5s ease'
              }}></div>
            </div>

            {/* Step 1 */}
            <div style={{ flex: 1, textAlign: 'center', position: 'relative', zIndex: 1 }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: statusInfo.step >= 1 ? 'linear-gradient(135deg, #00F0FF, #A855F7)' : 'rgba(0, 0, 0, 0.4)',
                border: `3px solid ${statusInfo.step >= 1 ? '#00F0FF' : '#444'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.75rem',
                fontWeight: '900',
                color: statusInfo.step >= 1 ? '#000' : '#666'
              }}>
                {statusInfo.step >= 1 ? '✓' : '1'}
              </div>
              <div style={{ color: statusInfo.step >= 1 ? '#00F0FF' : '#666', fontSize: '14px', fontWeight: '600' }}>
                Order Created
              </div>
              <div style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>
                Crypto locked in escrow
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ flex: 1, textAlign: 'center', position: 'relative', zIndex: 1 }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: statusInfo.step >= 2 ? 'linear-gradient(135deg, #00F0FF, #A855F7)' : 'rgba(0, 0, 0, 0.4)',
                border: `3px solid ${statusInfo.step >= 2 ? '#00F0FF' : '#444'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.75rem',
                fontWeight: '900',
                color: statusInfo.step >= 2 ? '#000' : '#666'
              }}>
                {statusInfo.step >= 2 ? '✓' : '2'}
              </div>
              <div style={{ color: statusInfo.step >= 2 ? '#00F0FF' : '#666', fontSize: '14px', fontWeight: '600' }}>
                Payment Made
              </div>
              <div style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>
                Buyer confirms payment
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ flex: 1, textAlign: 'center', position: 'relative', zIndex: 1 }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: statusInfo.step >= 3 ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'rgba(0, 0, 0, 0.4)',
                border: `3px solid ${statusInfo.step >= 3 ? '#22C55E' : '#444'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.75rem',
                fontWeight: '900',
                color: statusInfo.step >= 3 ? '#fff' : '#666'
              }}>
                {statusInfo.step >= 3 ? '✓' : '3'}
              </div>
              <div style={{ color: statusInfo.step >= 3 ? '#22C55E' : '#666', fontSize: '14px', fontWeight: '600' }}>
                Completed
              </div>
              <div style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>
                Crypto released to buyer
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          {/* Left Column - Instructions & Chat */}
          <div>
            {/* Trade Instructions */}
            <div style={{
              background: 'rgba(26, 31, 58, 0.8)',
              border: '2px solid rgba(0, 240, 255, 0.2)',
              borderRadius: '16px',
              padding: '2rem',
              marginBottom: '2rem'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '900',
                color: '#00F0FF',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <IoInformationCircle size={20} />
                {isBuyer ? 'Payment Instructions' : 'Seller Instructions'}
              </h2>

              {/* Buyer Instructions */}
              {isBuyer && trade?.status === 'pending_payment' && (
                <div>
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '2px solid #F59E0B',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#F59E0B', fontWeight: '700', marginBottom: '0.5rem' }}>
                      <IoWarning size={18} />
                      Important Steps
                    </div>
                    <ol style={{ color: '#fff', fontSize: '14px', lineHeight: '1.8', paddingLeft: '1.5rem', margin: 0 }}>
                      <li>Transfer the exact amount to the seller's payment details below</li>
                      <li>Keep proof of payment (screenshot/receipt)</li>
                      <li>Click "I Have Paid" button after making the transfer</li>
                      <li>Wait for seller to confirm and release crypto</li>
                      <li>If any issues, click "Raise Dispute" button</li>
                    </ol>
                  </div>

                  {/* Seller Payment Details */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    borderRadius: '12px',
                    padding: '1.5rem'
                  }}>
                    <h3 style={{ color: '#00F0FF', fontSize: '16px', fontWeight: '700', marginBottom: '1rem' }}>
                      Seller Payment Details
                    </h3>
                    
                    {seller?.payment_details && Object.entries(seller.payment_details).map(([key, value]) => (
                      <div key={key} style={{ marginBottom: '1rem' }}>
                        <div style={{ color: '#888', fontSize: '13px', marginBottom: '4px', textTransform: 'capitalize' }}>
                          {key.replace(/_/g, ' ')}
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          background: 'rgba(0, 240, 255, 0.1)',
                          border: '1px solid rgba(0, 240, 255, 0.3)',
                          borderRadius: '8px',
                          padding: '0.75rem 1rem'
                        }}>
                          <span style={{ color: '#fff', fontSize: '15px', fontWeight: '600', flex: 1 }}>
                            {value}
                          </span>
                          <button
                            onClick={() => handleCopy(value, key)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: copied[key] ? '#22C55E' : '#00F0FF',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                          >
                            {copied[key] ? <IoCheckmark size={18} /> : <IoCopy size={18} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Buyer - Payment Sent State */}
              {isBuyer && trade?.status === 'payment_sent' && (
                <div style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '2px solid #3B82F6',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  textAlign: 'center'
                }}>
                  <IoTime size={48} color="#3B82F6" style={{ margin: '0 auto 1rem' }} />
                  <h3 style={{ color: '#3B82F6', fontSize: '18px', fontWeight: '700', marginBottom: '0.5rem' }}>
                    Payment Confirmed
                  </h3>
                  <p style={{ color: '#888', fontSize: '14px' }}>
                    Waiting for seller to release crypto from escrow
                  </p>
                </div>
              )}

              {/* Seller Instructions */}
              {isSeller && trade?.status === 'pending_payment' && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '2px solid #F59E0B',
                  borderRadius: '12px',
                  padding: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#F59E0B', fontWeight: '700', marginBottom: '0.5rem' }}>
                    <IoTime size={18} />
                    Waiting for buyer to make payment
                  </div>
                  <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>
                    The buyer will transfer funds to your payment details. Once received, release the crypto.
                  </p>
                </div>
              )}

              {/* Seller - Payment Sent State */}
              {isSeller && trade?.status === 'payment_sent' && (
                <div>
                  <div style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '2px solid #22C55E',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#22C55E', fontWeight: '700', marginBottom: '0.5rem' }}>
                      <IoCheckmarkCircle size={18} />
                      Buyer has marked payment as sent
                    </div>
                    <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>
                      Check your bank account. Once you confirm receiving the payment, release the crypto.
                    </p>
                  </div>
                  
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '2px solid #EF4444',
                    borderRadius: '12px',
                    padding: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#EF4444', fontWeight: '700', marginBottom: '0.5rem' }}>
                      <IoWarning size={18} />
                      Important Warning
                    </div>
                    <p style={{ color: '#fff', fontSize: '14px', margin: 0 }}>
                      Only release crypto after confirming the full amount is in YOUR bank account. Do not release based on screenshots.
                    </p>
                  </div>
                </div>
              )}

              {/* Completed State */}
              {trade?.status === 'completed' && (
                <div style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '2px solid #22C55E',
                  borderRadius: '12px',
                  padding: '2rem',
                  textAlign: 'center'
                }}>
                  <IoCheckmarkCircle size={64} color="#22C55E" style={{ margin: '0 auto 1rem' }} />
                  <h3 style={{ color: '#22C55E', fontSize: '22px', fontWeight: '900', marginBottom: '0.5rem' }}>
                    Trade Completed Successfully! 🎉
                  </h3>
                  <p style={{ color: '#888', fontSize: '14px' }}>
                    {isBuyer ? 'Crypto has been released to your wallet' : 'Payment received and crypto released'}
                  </p>
                </div>
              )}

              {/* Disputed State */}
              {trade?.status === 'disputed' && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '2px solid #EF4444',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  textAlign: 'center'
                }}>
                  <IoShield size={48} color="#EF4444" style={{ margin: '0 auto 1rem' }} />
                  <h3 style={{ color: '#EF4444', fontSize: '18px', fontWeight: '700', marginBottom: '0.5rem' }}>
                    Trade Under Dispute
                  </h3>
                  <p style={{ color: '#888', fontSize: '14px' }}>
                    Our support team is reviewing this case. You will be notified of the resolution.
                  </p>
                </div>
              )}
            </div>

            {/* Chat Section */}
            <div style={{
              background: 'rgba(26, 31, 58, 0.8)',
              border: '2px solid rgba(0, 240, 255, 0.2)',
              borderRadius: '16px',
              padding: '2rem',
              height: '400px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '900',
                color: '#00F0FF',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <IoChatbubbles size={20} />
                Trade Chat
              </h2>

              {/* Messages */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#888', padding: '2rem', fontSize: '14px' }}>
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      style={{
                        alignSelf: msg.user_id === user.user_id ? 'flex-end' : 'flex-start',
                        maxWidth: '70%'
                      }}
                    >
                      <div style={{
                        background: msg.user_id === user.user_id 
                          ? 'linear-gradient(135deg, #00F0FF, #00B8E6)' 
                          : 'rgba(0, 0, 0, 0.4)',
                        border: msg.user_id === user.user_id ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        padding: '0.75rem 1rem',
                        color: msg.user_id === user.user_id ? '#000' : '#fff'
                      }}>
                        <div style={{ fontSize: '11px', marginBottom: '4px', opacity: 0.7 }}>
                          {msg.user_id === user.user_id ? 'You' : (isBuyer ? 'Seller' : 'Buyer')}
                        </div>
                        <div style={{ fontSize: '14px', wordBreak: 'break-word' }}>
                          {msg.message}
                        </div>
                        <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.6, textAlign: 'right' }}>
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  style={{
                    flex: 1,
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                  disabled={sendingMessage}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  style={{
                    background: sendingMessage || !newMessage.trim() 
                      ? 'rgba(100, 100, 100, 0.3)' 
                      : 'linear-gradient(135deg, #00F0FF, #A855F7)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem 1.5rem',
                    color: sendingMessage || !newMessage.trim() ? '#666' : '#000',
                    cursor: sendingMessage || !newMessage.trim() ? 'not-allowed' : 'pointer',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <IoSend size={16} />
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Trade Details & Actions */}
          <div>
            {/* Trade Summary */}
            <div style={{
              background: 'rgba(26, 31, 58, 0.8)',
              border: '2px solid rgba(0, 240, 255, 0.2)',
              borderRadius: '16px',
              padding: '2rem',
              marginBottom: '2rem'
            }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '900',
                color: '#00F0FF',
                marginBottom: '1.5rem'
              }}>
                Trade Summary
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ color: '#888', fontSize: '13px', marginBottom: '4px' }}>
                    Amount
                  </div>
                  <div style={{ color: '#fff', fontSize: '24px', fontWeight: '900' }}>
                    {trade?.crypto_amount} {trade?.crypto_currency}
                  </div>
                </div>

                <div style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  paddingTop: '1rem'
                }}>
                  <div style={{ color: '#888', fontSize: '13px', marginBottom: '4px' }}>
                    Price
                  </div>
                  <div style={{ color: '#fff', fontSize: '20px', fontWeight: '700' }}>
                    £{trade?.price_per_unit?.toFixed(2)} / {trade?.crypto_currency}
                  </div>
                </div>

                <div style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  paddingTop: '1rem'
                }}>
                  <div style={{ color: '#888', fontSize: '13px', marginBottom: '4px' }}>
                    Total Amount
                  </div>
                  <div style={{ color: '#00F0FF', fontSize: '28px', fontWeight: '900' }}>
                    £{(trade?.crypto_amount * trade?.price_per_unit)?.toFixed(2)}
                  </div>
                </div>

                <div style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  paddingTop: '1rem'
                }}>
                  <div style={{ color: '#888', fontSize: '13px', marginBottom: '4px' }}>
                    Payment Method
                  </div>
                  <div style={{
                    background: 'rgba(0, 240, 255, 0.1)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    color: '#00F0FF',
                    fontSize: '15px',
                    fontWeight: '600'
                  }}>
                    {trade?.payment_method?.replace(/_/g, ' ').toUpperCase()}
                  </div>
                </div>

                <div style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  paddingTop: '1rem'
                }}>
                  <div style={{ color: '#888', fontSize: '13px', marginBottom: '4px' }}>
                    {isBuyer ? 'Seller' : 'Buyer'}
                  </div>
                  <div style={{ color: '#fff', fontSize: '16px', fontWeight: '600' }}>
                    {isBuyer ? seller?.full_name : trade?.buyer_name}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              background: 'rgba(26, 31, 58, 0.8)',
              border: '2px solid rgba(0, 240, 255, 0.2)',
              borderRadius: '16px',
              padding: '2rem'
            }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '900',
                color: '#00F0FF',
                marginBottom: '1.5rem'
              }}>
                Actions
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Buyer - I Have Paid Button */}
                {isBuyer && trade?.status === 'pending_payment' && (
                  <button
                    onClick={handleMarkAsPaid}
                    style={{
                      background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '1rem',
                      color: '#fff',
                      fontSize: '16px',
                      fontWeight: '900',
                      cursor: 'pointer',
                      boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 0 30px rgba(34, 197, 94, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(34, 197, 94, 0.4)';
                    }}
                  >
                    ✅ I Have Paid
                  </button>
                )}

                {/* Seller - Release Crypto Button */}
                {isSeller && trade?.status === 'payment_sent' && (
                  <button
                    onClick={handleReleaseCrypto}
                    style={{
                      background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '1rem',
                      color: '#fff',
                      fontSize: '16px',
                      fontWeight: '900',
                      cursor: 'pointer',
                      boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 0 30px rgba(34, 197, 94, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(34, 197, 94, 0.4)';
                    }}
                  >
                    🚀 Release Crypto
                  </button>
                )}

                {/* Dispute Button - Always visible except completed */}
                {trade?.status !== 'completed' && trade?.status !== 'disputed' && (
                  <button
                    onClick={handleDispute}
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '2px solid #EF4444',
                      borderRadius: '12px',
                      padding: '1rem',
                      color: '#EF4444',
                      fontSize: '15px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <IoWarning size={16} style={{ display: 'inline', marginRight: '8px' }} />
                    Raise Dispute
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
