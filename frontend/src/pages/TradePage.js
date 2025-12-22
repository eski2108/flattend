import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { IoArrowBack, IoChatbubbles, IoCheckmark as Check, IoCheckmarkCircle, IoCloseCircle as XCircle, IoCopy, IoSend, IoShield, IoTime as Clock, IoWallet } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';
import TradeChat from '@/components/TradeChat';
import { getCryptoEmoji, getCryptoColor } from '@/utils/cryptoIcons';
import { getCoinLogo } from '@/utils/coinLogos';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function TradePage() {
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
  const [showChat, setShowChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);
  
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
      const apiUrl = `${BACKEND_URL}/api/p2p/trade/${tradeId}`;
      console.log('Loading trade from:', apiUrl);
      const response = await axios.get(apiUrl);
      console.log('Trade response:', response.data);
      
      if (response.data.success && response.data.trade) {
        setTrade(response.data.trade);
        setSeller(response.data.seller);
        setTimeLeft(response.data.time_remaining_seconds || 0);
        setLoading(false);
      } else {
        console.error('Invalid response format:', response.data);
        toast.error('Invalid trade data received');
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to load trade:', error);
      console.error('Error details:', error.response?.data);
      toast.error(error.response?.data?.detail || 'Failed to load trade details');
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/p2p/trade/${tradeId}/messages`);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!window.confirm('Have you transferred the payment to the seller? Only confirm if you have actually sent the money.')) {
      return;
    }
    
    try {
      await axios.post(`${BACKEND_URL}/api/p2p/mark-paid`, {
        trade_id: tradeId,
        buyer_id: user.user_id
      });
      toast.success('Payment marked as sent! Waiting for seller confirmation.');
      await loadTradeDetails();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to mark as paid');
    }
  };

  const handleReleaseCrypto = async () => {
    if (!window.confirm('Have you received the payment in your bank account? This will release the crypto from escrow to the buyer.')) {
      return;
    }
    
    try {
      await axios.post(`${BACKEND_URL}/api/p2p/release-crypto`, {
        trade_id: tradeId,
        seller_id: user.user_id
      });
      toast.success('Crypto released successfully!');
      await loadTradeDetails();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to release crypto');
    }
  };

  const handleDispute = async () => {
    if (!window.confirm('Are you sure you want to open a dispute? This will freeze the trade and require admin review. Only proceed if you have not received payment.')) {
      return;
    }
    
    try {
      await axios.post(`${BACKEND_URL}/api/p2p/disputes/create`, {
        trade_id: tradeId,
        reporter_id: user.user_id,
        reporter_role: isSeller ? 'seller' : 'buyer',
        reason: isSeller ? 'Payment not received' : 'Issue with trade',
        description: 'User has opened a dispute for this trade. Awaiting admin review.'
      });
      toast.success('Dispute opened. An admin will review this case shortly. Crypto remains in escrow.');
      await loadTradeDetails();
    } catch (error) {
      console.error('Dispute error:', error);
      toast.error(error.response?.data?.detail || 'Failed to open dispute');
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this trade? The escrow will be released back to the seller.')) {
      return;
    }
    
    try {
      await axios.post(`${BACKEND_URL}/api/p2p/cancel-trade`, {
        trade_id: tradeId,
        user_id: user.user_id,
        reason: 'User requested cancellation'
      });
      toast.success('Trade cancelled');
      navigate('/my-orders');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel trade');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    try {
      setSendingMessage(true);
      const role = isBuyer ? 'buyer' : 'seller';
      await axios.post(`${BACKEND_URL}/api/p2p/trade/message`, {
        trade_id: tradeId,
        sender_id: user.user_id,
        sender_role: role,
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

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Allowed: JPG, PNG, PDF, DOC, DOCX, TXT');
      return;
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB');
      return;
    }
    
    setSelectedFile(file);
  };

  const handleUploadFile = async () => {
    if (!selectedFile) return;
    
    try {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('trade_id', tradeId);
      formData.append('sender_id', user.user_id);
      formData.append('sender_role', isBuyer ? 'buyer' : 'seller');
      
      await axios.post(`${BACKEND_URL}/api/p2p/trade/upload-attachment`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success('File uploaded successfully');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await loadMessages();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDownloadAttachment = (attachmentUrl) => {
    const fullUrl = `${BACKEND_URL}${attachmentUrl}`;
    window.open(fullUrl, '_blank');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusInfo = () => {
    if (!trade) return { text: 'Loading...', color: '#888', icon: Clock };
    
    switch (trade.status) {
      case 'pending_payment':
        return { text: 'Waiting for Payment', color: '#F59E0B', icon: Clock };
      case 'buyer_marked_paid':
        return { text: 'Buyer Marked as Paid - Waiting for Seller', color: '#3B82F6', icon: CheckCircle };
      case 'released':
        return { text: 'Completed - Crypto Released', color: '#22C55E', icon: CheckCircle };
      case 'cancelled':
        return { text: 'Cancelled', color: '#EF4444', icon: XCircle };
      case 'disputed':
        return { text: 'In Dispute - Admin Review', color: '#EF4444', icon: AlertTriangle };
      default:
        return { text: trade.status, color: '#888', icon: Clock };
    }
  };

  if (loading || !trade) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ border: '4px solid rgba(0, 240, 255, 0.1)', borderTop: '4px solid #00F0FF', borderRadius: '50%', width: '50px', height: '50px', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
          <p style={{ color: '#00F0FF' }}>Loading trade...</p>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <button onClick={() => navigate('/my-orders')} style={{ background: 'none', border: 'none', color: '#00F0FF', fontSize: '14px', cursor: 'pointer', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IoArrowBack size={20} /> Back to My Orders
        </button>

        {/* Escrow Banner */}
        {trade.escrow_locked && (
          <div style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 0 30px rgba(34, 197, 94, 0.4)' }}>
            <IoShield size={28} color="#FFF" />
            <div>
              <div style={{ color: '#FFF', fontSize: '18px', fontWeight: '900' }}>
                <img src={getCoinLogo(trade.crypto_currency)} alt={trade.crypto_currency} style={{ width: '24px', height: '24px', marginRight: '8px', objectFit: 'contain', display: 'inline-block', verticalAlign: 'middle' }} />
                {trade.crypto_amount} {trade.crypto_currency} Locked in Escrow
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px' }}>
                Protected until trade completion or dispute resolution
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          {/* Main Column */}
          <div>
            {/* Status Card */}
            <Card style={{ background: 'rgba(26, 31, 58, 0.8)', border: '2px solid ' + statusInfo.color, borderRadius: '16px', padding: '2rem', marginBottom: '2rem', boxShadow: `0 0 30px ${statusInfo.color}40` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <StatusIcon size={32} color={statusInfo.color} />
                  <div>
                    <h2 style={{ color: statusInfo.color, fontSize: '20px', fontWeight: '900' }}>{statusInfo.text}</h2>
                    <p style={{ color: '#888', fontSize: '13px', marginTop: '4px' }}>Trade ID: {tradeId.substring(0, 8)}...</p>
                  </div>
                </div>
                {trade.status === 'pending_payment' && timeLeft > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: timeLeft < 300 ? '#EF4444' : '#00F0FF', fontSize: '36px', fontWeight: '900' }}>
                      {formatTime(timeLeft)}
                    </div>
                    <div style={{ color: '#888', fontSize: '13px' }}>Remaining</div>
                  </div>
                )}
              </div>

              {/* Status Steps */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
                {[
                  { label: 'Created', active: true },
                  { label: 'Payment Sent', active: ['buyer_marked_paid', 'released'].includes(trade.status) },
                  { label: 'Seller Confirms', active: trade.status === 'released' },
                  { label: 'Completed', active: trade.status === 'released' }
                ].map((step, idx) => (
                  <React.Fragment key={idx}>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: step.active ? '#22C55E' : 'rgba(0, 0, 0, 0.4)', border: step.active ? '2px solid #22C55E' : '2px solid #444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                        {step.active && <IoCheckmarkCircle size={24} color="#FFF" />}
                      </div>
                      <div style={{ color: step.active ? '#FFF' : '#666', fontSize: '12px', fontWeight: '600' }}>{step.label}</div>
                    </div>
                    {idx < 3 && <div style={{ height: '2px', flex: 1, background: step.active ? '#22C55E' : '#444', marginBottom: '32px' }} />}
                  </React.Fragment>
                ))}
              </div>
            </Card>

            {/* Trade Details */}
            <Card style={{ background: 'rgba(26, 31, 58, 0.8)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '16px', padding: '2rem', marginBottom: '2rem' }}>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '900', marginBottom: '1.5rem' }}>Trade Details</h3>
              {[
                { 
                  label: 'Amount', 
                  value: trade?.crypto_currency && trade?.crypto_amount ? (
                    <span>
                      <img src={getCoinLogo(trade.crypto_currency)} alt={trade.crypto_currency} style={{ width: '20px', height: '20px', marginRight: '6px', objectFit: 'contain', display: 'inline-block', verticalAlign: 'middle' }} />
                      {trade.crypto_amount} {trade.crypto_currency}
                    </span>
                  ) : 'N/A' 
                },
                { label: 'Price', value: trade?.fiat_amount && trade?.fiat_currency ? `${trade.fiat_currency === 'USD' ? '$' : ''}${trade.fiat_amount.toLocaleString()}` : 'N/A' },
                { label: 'Payment Method', value: trade?.payment_method || 'N/A' },
                { label: isBuyer ? 'Seller' : 'Buyer', value: seller?.username || 'User' }
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: idx < 3 ? '1px solid rgba(0, 240, 255, 0.1)' : 'none' }}>
                  <span style={{ color: '#888', fontSize: '14px' }}>{item.label}</span>
                  <span style={{ color: '#fff', fontSize: '16px', fontWeight: '700' }}>{item.value}</span>
                </div>
              ))}
              
              {/* NEW: Buyer's Wallet Address - CRITICAL INFO */}
              {trade.buyer_wallet_address && (
                <div style={{ 
                  marginTop: '1.5rem',
                  padding: '1.25rem',
                  background: 'rgba(168, 85, 247, 0.1)',
                  border: '2px solid rgba(168, 85, 247, 0.4)',
                  borderRadius: '12px'
                }}>
                  <div style={{ 
                    color: '#A855F7', 
                    fontSize: '0.875rem', 
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <IoWallet size={18} />
                    Buyer's Wallet Address
                  </div>
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    padding: '0.875rem',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                    wordBreak: 'break-all'
                  }}>
                    <div style={{
                      color: '#fff',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      marginBottom: '0.5rem'
                    }}>
                      {trade.buyer_wallet_address}
                    </div>
                    {trade.buyer_wallet_network && (
                      <div style={{
                        color: '#A855F7',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        Network: {trade.buyer_wallet_network}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(trade.buyer_wallet_address);
                      toast.success('Wallet address copied!');
                    }}
                    style={{
                      background: 'rgba(168, 85, 247, 0.2)',
                      border: '1px solid #A855F7',
                      borderRadius: '8px',
                      padding: '0.5rem 0.875rem',
                      color: '#A855F7',
                      fontSize: '0.8125rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <IoCopy size={14} />
                    Copy Address
                  </button>
                  {isSeller && (
                    <div style={{
                      marginTop: '0.75rem',
                      color: '#888',
                      fontSize: '0.75rem',
                      lineHeight: '1.5'
                    }}>
                      ⚠️ Send crypto to this address after confirming payment received
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Trade Chat Button */}
            <Card style={{ 
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15), rgba(168, 85, 247, 0.15))', 
              border: '2px solid rgba(0, 240, 255, 0.3)', 
              borderRadius: '16px', 
              padding: '1.5rem', 
              marginBottom: '2rem',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onClick={() => setShowChat(true)}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 240, 255, 0.4)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <IoChatbubbles size={24} color="#fff" />
                  </div>
                  <div>
                    <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', marginBottom: '0.25rem' }}>
                      Trade Chat
                    </h3>
                    <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                      Communicate with {isBuyer ? 'seller' : 'buyer'} directly
                    </p>
                  </div>
                </div>
                {unreadCount > 0 && (
                  <div style={{
                    background: '#EF4444',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '700'
                  }}>
                    {unreadCount}
                  </div>
                )}
              </div>
            </Card>

            {/* Action Buttons */}
            {isBuyer && trade.status === 'pending_payment' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <button onClick={handleMarkAsPaid} style={{ padding: '16px', background: 'linear-gradient(135deg, #22C55E, #16A34A)', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '900', color: '#fff', cursor: 'pointer', boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)' }}>
                  I Have Paid
                </button>
                <button onClick={handleCancel} style={{ padding: '16px', background: 'transparent', border: '2px solid #EF4444', borderRadius: '12px', fontSize: '16px', fontWeight: '900', color: '#EF4444', cursor: 'pointer' }}>
                  Cancel Trade
                </button>
              </div>
            )}
            
            {isBuyer && trade.status === 'buyer_marked_paid' && (
              <div style={{ marginBottom: '2rem' }}>
                <button onClick={handleDispute} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #F59E0B, #EAB308)', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '900', color: '#000', cursor: 'pointer', boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)' }}>
                  <AlertTriangle size={20} style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }} />
                  Open Dispute if Seller Not Responding
                </button>
              </div>
            )}

            {isSeller && trade.status === 'buyer_marked_paid' && (
              <>
                {/* WARNING BANNER */}
                <div style={{
                  background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                  border: '2px solid #FEE2E2',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'start',
                  gap: '12px',
                  boxShadow: '0 0 30px rgba(239, 68, 68, 0.4)'
                }}>
                  <AlertTriangle size={32} color="#FFF" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ color: '#FFF', fontSize: '18px', fontWeight: '900', marginBottom: '8px' }}>
                      ⚠️ DO NOT RELEASE CRYPTO UNTIL PAYMENT IS CONFIRMED
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', lineHeight: '1.6' }}>
                      • Check your bank account/payment app to confirm funds received<br />
                      • Verify the exact amount matches the trade<br />
                      • Never release crypto based on screenshots alone<br />
                      • Contact support if anything seems suspicious
                    </div>
                  </div>
                </div>
                
                {/* BUYER'S WALLET ADDRESS - PROMINENT DISPLAY FOR SELLER */}
                {trade.buyer_wallet_address && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(139, 92, 246, 0.2))',
                    border: '3px solid #A855F7',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    marginBottom: '1.5rem',
                    boxShadow: '0 0 30px rgba(168, 85, 247, 0.3)'
                  }}>
                    <div style={{ 
                      color: '#fff',
                      fontSize: '16px',
                      fontWeight: '900',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <IoWallet size={24} color="#A855F7" />
                      SEND <img src={getCoinLogo(trade.crypto_currency)} alt={trade.crypto_currency} style={{ width: '20px', height: '20px', margin: '0 6px', objectFit: 'contain', display: 'inline-block', verticalAlign: 'middle' }} /> {trade.crypto_amount} {trade.crypto_currency} TO THIS ADDRESS:
                    </div>
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '2px solid #A855F7',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{
                        color: '#00F0FF',
                        fontFamily: 'monospace',
                        fontSize: '1rem',
                        fontWeight: '700',
                        wordBreak: 'break-all',
                        lineHeight: '1.6',
                        marginBottom: '0.75rem'
                      }}>
                        {trade.buyer_wallet_address}
                      </div>
                      {trade.buyer_wallet_network && (
                        <div style={{
                          color: '#A855F7',
                          fontSize: '0.875rem',
                          fontWeight: '700',
                          padding: '0.5rem 0.75rem',
                          background: 'rgba(168, 85, 247, 0.2)',
                          borderRadius: '8px',
                          display: 'inline-block'
                        }}>
                          Network: {trade.buyer_wallet_network}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(trade.buyer_wallet_address);
                        toast.success('Wallet address copied to clipboard!');
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #A855F7, #8B5CF6)',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '0.875rem 1.25rem',
                        color: '#fff',
                        fontSize: '0.9375rem',
                        fontWeight: '900',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(168, 85, 247, 0.4)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <IoCopy size={18} />
                      COPY WALLET ADDRESS
                    </button>
                    <div style={{
                      marginTop: '1rem',
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: '0.8125rem',
                      lineHeight: '1.6',
                      padding: '0.75rem',
                      background: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: '8px'
                    }}>
                      💡 Tip: Double-check the address before sending. Use the copy button to avoid typos.
                    </div>
                  </div>
                )}
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                  <button onClick={handleReleaseCrypto} style={{ padding: '16px', background: 'linear-gradient(135deg, #22C55E, #16A34A)', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '900', color: '#fff', cursor: 'pointer', boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)' }}>
                    ✓ Payment Received - Release Crypto
                  </button>
                  <button onClick={handleDispute} style={{ padding: '16px', background: 'linear-gradient(135deg, #EF4444, #DC2626)', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '900', color: '#fff', cursor: 'pointer', boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)' }}>
                    ✗ I Have Not Received Payment
                  </button>
                </div>
              </>
            )}

            {/* Support Link */}
            <div style={{
              background: 'rgba(0, 240, 255, 0.05)',
              border: '1px solid rgba(0, 240, 255, 0.2)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '2rem',
              textAlign: 'center'
            }}>
              <p style={{ color: '#888', fontSize: '14px', marginBottom: '0.5rem' }}>
                Need help with this trade?
              </p>
              <a
                href={`mailto:support@coinhubx.com?subject=Trade Support - ${tradeId}&body=Trade ID: ${tradeId}%0AUser ID: ${user?.user_id}%0A%0ADescribe your issue:`}
                style={{
                  color: '#00F0FF',
                  fontSize: '16px',
                  fontWeight: '700',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <IoChatbubbles size={18} />
                Contact Support
              </a>
            </div>
          </div>

          {/* Chat Column */}
          <div>
            <Card style={{ background: 'rgba(26, 31, 58, 0.8)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '16px', padding: '1.5rem', height: '600px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '900', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IoChatbubbles size={24} color="#00F0FF" />
                Trade Chat
              </h3>
              <p style={{ color: '#888', fontSize: '12px', marginBottom: '1rem' }}>All messages are recorded for dispute protection</p>

              <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px', padding: '1rem' }}>
                {messages.length === 0 ? (
                  <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>No messages yet</p>
                ) : (
                  messages.map(msg => (
                    <div key={msg.message_id} style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', alignItems: msg.sender_id === user.user_id ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '80%', padding: '0.75rem 1rem', borderRadius: '12px', background: msg.sender_id === user.user_id ? '#00F0FF' : 'rgba(255, 255, 255, 0.1)' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', marginBottom: '4px', color: msg.sender_id === user.user_id ? '#000' : '#888' }}>{msg.sender_role === 'buyer' ? 'Buyer' : 'Seller'}</div>
                        <div style={{ color: msg.sender_id === user.user_id ? '#000' : '#fff', fontSize: '14px' }}>{msg.message}</div>
                        {msg.attachment_url && (
                          <button
                            onClick={() => handleDownloadAttachment(msg.attachment_url)}
                            style={{
                              marginTop: '8px',
                              padding: '8px 12px',
                              background: msg.sender_id === user.user_id ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 240, 255, 0.2)',
                              border: `1px solid ${msg.sender_id === user.user_id ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 240, 255, 0.4)'}`,
                              borderRadius: '8px',
                              color: msg.sender_id === user.user_id ? '#000' : '#00F0FF',
                              fontSize: '13px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            📎 {msg.attachment_name || 'Download Attachment'}
                          </button>
                        )}
                        <div style={{ fontSize: '10px', color: msg.sender_id === user.user_id ? 'rgba(0, 0, 0, 0.6)' : '#666', marginTop: '4px' }}>
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* File Upload Section */}
              {selectedFile && (
                <div style={{ 
                  marginBottom: '0.75rem', 
                  padding: '12px', 
                  background: 'rgba(0, 240, 255, 0.1)', 
                  border: '1px solid rgba(0, 240, 255, 0.3)', 
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <span style={{ fontSize: '20px' }}>📎</span>
                    <span style={{ color: '#fff', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedFile.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleUploadFile}
                      disabled={uploadingFile}
                      style={{
                        padding: '8px 16px',
                        background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: uploadingFile ? 'not-allowed' : 'pointer',
                        opacity: uploadingFile ? 0.5 : 1
                      }}
                    >
                      {uploadingFile ? 'Uploading...' : 'Upload'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      disabled={uploadingFile}
                      style={{
                        padding: '8px 16px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '6px',
                        color: '#EF4444',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: uploadingFile ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.txt"
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile || sendingMessage}
                  style={{
                    padding: '12px',
                    background: 'rgba(168, 85, 247, 0.2)',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    borderRadius: '8px',
                    cursor: uploadingFile || sendingMessage ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Attach file (proof of payment, etc.)"
                >
                  <span style={{ fontSize: '20px' }}>📎</span>
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  style={{ flex: 1, padding: '12px', background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
                />
                <button type="submit" disabled={sendingMessage || !newMessage.trim()} style={{ padding: '12px 20px', background: 'linear-gradient(135deg, #00F0FF, #A855F7)', border: 'none', borderRadius: '8px', cursor: 'pointer', opacity: sendingMessage || !newMessage.trim() ? 0.5 : 1 }}>
                  <IoSend size={20} color="#000" />
                </button>
              </form>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Trade Chat Panel */}
      {showChat && user && trade && (
        <TradeChat 
          tradeId={tradeId}
          userId={user.user_id}
          userRole={isBuyer ? 'buyer' : 'seller'}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}
